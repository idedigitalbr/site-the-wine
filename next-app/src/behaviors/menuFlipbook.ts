import { menuPages } from '@/config/content';
import type { Cleanup } from '@/behaviors/types';

type PageFlipConstructor = NonNullable<NonNullable<Window['St']>['PageFlip']>;
type PageFlipInstance = InstanceType<PageFlipConstructor>;

const PDF_URL = '/assets/CardapioMenu/CARDAPIO_THE_WINE.pdf';
const PAGE_FLIP_OPTIONS: Record<string, unknown> = {
  width: 595,
  height: 842,
  size: 'stretch',
  minWidth: 220,
  maxWidth: 980,
  minHeight: 260,
  maxHeight: 1385,
  drawShadow: true,
  maxShadowOpacity: 0.48,
  flippingTime: 720,
  usePortrait: true,
  showCover: true,
  autoSize: false,
  mobileScrollSupport: false,
  swipeDistance: 30,
  useMouseEvents: true,
  showPageCorners: true,
  disableFlipByClick: false,
};

function normalizePage(page: string | number, total: number) {
  const max = Math.max(1, Number(total) || 1);
  const value = Number.parseInt(String(page), 10);
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(1, value));
}

export function setupMenuFlipbook(): Cleanup {
  const modal = document.getElementById('menuModal');
  const stage = document.getElementById('menuFlipbookStage');
  const pages = document.getElementById('menuFlipbookPages');
  const loading = document.getElementById('menuPdfLoading');
  const error = document.getElementById('menuPdfError');
  const retry = document.getElementById('menuRetryBtn') as HTMLButtonElement | null;
  const close = document.getElementById('menuModalCloseBtn') as HTMLButtonElement | null;
  const previous = document.getElementById('menuPrevBtn') as HTMLButtonElement | null;
  const next = document.getElementById('menuNextBtn') as HTMLButtonElement | null;
  const pageInput = document.getElementById('menuPageInput') as HTMLInputElement | null;
  const pageTotal = document.getElementById('menuPageTotal');
  const fullscreen = document.getElementById('menuFullscreenBtn') as HTMLButtonElement | null;

  if (!modal || !stage || !pages) return () => {};

  const cleanupHandlers: Cleanup[] = [];
  let pageFlip: PageFlipInstance | null = null;
  let initializationPromise: Promise<PageFlipInstance | null> | null = null;
  let currentPage = 1;
  let totalPages = menuPages.desktop.length;
  let zoom = 1;
  let isOpen = false;
  let isAnimating = false;
  let resizeTimer: number | null = null;
  let lastFocusedElement: HTMLElement | null = null;
  let menuModalScrollY = 0;
  let pinchGesture: { distance: number; zoom: number } | null = null;
  let pausedBackgroundVideos: HTMLVideoElement[] = [];
  const backgroundVideoPlayHandlers = new Map<HTMLVideoElement, EventListener>();
  let disposed = false;

  const addEvent = (
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions,
  ) => {
    target.addEventListener(type, handler, options);
    cleanupHandlers.push(() => target.removeEventListener(type, handler, options));
  };

  const setLoading = (visible: boolean) => {
    if (loading) loading.hidden = !visible;
  };

  const setError = (visible: boolean) => {
    if (error) error.hidden = !visible;
  };

  const getPageImagesForViewport = () => (
    window.matchMedia('(max-width: 820px)').matches ? [...menuPages.mobile] : [...menuPages.desktop]
  );

  const getCurrentPageNumber = () => {
    if (!pageFlip || typeof pageFlip.getCurrentPageIndex !== 'function') {
      return normalizePage(currentPage, totalPages);
    }
    return normalizePage(pageFlip.getCurrentPageIndex() + 1, totalPages);
  };

  const updateControls = () => {
    currentPage = getCurrentPageNumber();
    if (pageInput) {
      pageInput.value = String(currentPage);
      pageInput.max = String(Math.max(totalPages, 1));
    }
    if (pageTotal) pageTotal.textContent = totalPages ? String(totalPages) : '—';
    pages.classList.toggle('is-cover', currentPage === 1);
    if (previous) previous.disabled = !pageFlip || currentPage <= 1 || isAnimating;
    if (next) next.disabled = !pageFlip || currentPage >= totalPages || isAnimating;
    stage.setAttribute('aria-label', `Leitor do cardápio, página ${currentPage} de ${totalPages}`);
  };

  const updateZoomState = () => {
    pages.style.setProperty('--flipbook-zoom', String(zoom));
    pages.classList.toggle('is-zoomed', zoom > 1);
  };

  const updateResponsiveBookMode = () => {
    if (!pageFlip || typeof pageFlip.getSettings !== 'function') return;
    const mobile = window.matchMedia('(max-width: 820px)').matches;
    const settings = pageFlip.getSettings();
    settings.minWidth = 220;
    settings.drawShadow = !mobile;
    settings.maxShadowOpacity = mobile ? 0.18 : 0.48;
    settings.flippingTime = mobile ? 560 : 720;
  };

  const updateCanvasResolution = () => {
    if (!pageFlip) return;
    const canvas = pageFlip.getUI?.()?.getCanvas?.();
    const render = pageFlip.getRender?.();
    const context = render?.getContext?.();
    if (!canvas || !render || !context) return;

    const bounds = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.round(bounds.width));
    const cssHeight = Math.max(1, Math.round(bounds.height));
    const mobile = window.matchMedia('(max-width: 820px)').matches;
    const pixelRatio = mobile
      ? Math.min(window.devicePixelRatio || 1, 3)
      : Math.max(2, Math.min(window.devicePixelRatio || 1, 3));
    const pixelWidth = Math.round(cssWidth * pixelRatio);
    const pixelHeight = Math.round(cssHeight * pixelRatio);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    render.update();
  };

  const centerCoverPage = () => {
    const canvas = pageFlip?.getUI?.()?.getCanvas?.();
    if (!canvas) return;

    const isDesktop = window.matchMedia('(min-width: 821px)').matches;
    if (!isDesktop || currentPage !== 1) {
      canvas.style.removeProperty('left');
      return;
    }

    const bounds = pageFlip?.getBoundsRect?.();
    const pageWidth = Number(bounds?.pageWidth);
    if (!Number.isFinite(pageWidth) || pageWidth <= 0) return;

    const stageRect = stage.getBoundingClientRect();
    const pagesRect = pages.getBoundingClientRect();
    const renderLeft = Number(bounds?.left) || 0;
    const coverCenter = renderLeft + (pageWidth * 1.5);
    const targetLeft = stageRect.left + stageRect.width / 2 - pagesRect.left - coverCenter;
    canvas.style.left = `${Math.round(targetLeft * 100) / 100}px`;
  };

  const lockPageScroll = (locked: boolean) => {
    document.documentElement.classList.toggle('menu-modal-open', locked);
    document.body.classList.toggle('menu-modal-open', locked);
    document.body.style.overflow = locked ? 'hidden' : '';
    document.documentElement.style.overflow = locked ? 'hidden' : '';
  };

  const setBackgroundVideosPaused = (paused: boolean) => {
    const backgroundVideos = Array.from(document.querySelectorAll<HTMLVideoElement>('video'))
      .filter((video) => !modal.contains(video));

    if (paused) {
      if (backgroundVideoPlayHandlers.size) return;
      pausedBackgroundVideos = backgroundVideos.filter((video) => !video.paused);
      backgroundVideos.forEach((video) => {
        const preventBackgroundPlayback: EventListener = () => video.pause();
        backgroundVideoPlayHandlers.set(video, preventBackgroundPlayback);
        video.addEventListener('play', preventBackgroundPlayback);
        video.pause();
      });
      return;
    }

    backgroundVideoPlayHandlers.forEach((handler, video) => {
      video.removeEventListener('play', handler);
    });
    backgroundVideoPlayHandlers.clear();
    pausedBackgroundVideos.forEach((video) => {
      void video.play().catch(() => {});
    });
    pausedBackgroundVideos = [];
  };

  const handlePageFlip = ({ data }: { data: number }) => {
    currentPage = normalizePage(Number(data) + 1, totalPages);
    isAnimating = false;
    setLoading(false);
    setError(false);
    updateControls();
    centerCoverPage();
  };

  const initializeReader = async (): Promise<PageFlipInstance | null> => {
    if (pageFlip) {
      setLoading(false);
      updateControls();
      return pageFlip;
    }
    if (initializationPromise) return initializationPromise;

    setError(false);
    setLoading(true);

    initializationPromise = (async () => {
      const PageFlip = window.St?.PageFlip;
      if (!PageFlip) throw new Error('StPageFlip não está disponível.');

      const instance = new PageFlip(pages, PAGE_FLIP_OPTIONS);
      if (disposed) {
        instance.destroy?.();
        return null;
      }

      pageFlip = instance;
      pageFlip.on('init', handlePageFlip);
      pageFlip.on('flip', handlePageFlip);
      pageFlip.on('changeOrientation', () => {
        updateControls();
        centerCoverPage();
      });
      updateResponsiveBookMode();

      const images = getPageImagesForViewport();
      totalPages = images.length;
      pageFlip.loadFromImages(images);
      updateControls();

      await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
      if (disposed || !pageFlip) return null;

      updateCanvasResolution();
      setLoading(false);
      updateControls();
      centerCoverPage();
      return pageFlip;
    })();

    try {
      return await initializationPromise;
    } catch (readerError) {
      console.error(`Erro ao carregar o cardápio local (${PDF_URL}):`, readerError);
      pageFlip?.destroy?.();
      pageFlip = null;
      setLoading(false);
      setError(true);
      return null;
    } finally {
      initializationPromise = null;
    }
  };

  const requestPageFlip = (action: 'flipPrev' | 'flipNext') => {
    if (!pageFlip || isAnimating) return;
    if (action === 'flipPrev' && currentPage <= 1) return;
    if (action === 'flipNext' && currentPage >= totalPages) return;

    isAnimating = true;
    updateControls();
    if (action === 'flipPrev') pageFlip.flipPrev?.('bottom');
    else pageFlip.flipNext?.('top');
  };

  const goToPage = (targetPage: string | number) => {
    if (!pageFlip || isAnimating) return;
    const target = normalizePage(targetPage, totalPages);
    if (target === currentPage) return;

    if (typeof pageFlip.turnToPage === 'function') {
      pageFlip.turnToPage(target - 1);
      currentPage = target;
      isAnimating = false;
      updateControls();
      centerCoverPage();
      return;
    }

    isAnimating = true;
    updateControls();
    pageFlip.flip?.(target - 1, 'top');
  };

  const openMenuModal = () => {
    menuModalScrollY = window.scrollY;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    isOpen = true;
    setBackgroundVideosPaused(true);
    modal.style.display = 'flex';
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    lockPageScroll(true);
    stage.focus({ preventScroll: true });

    if (pageFlip) {
      updateControls();
      centerCoverPage();
    } else {
      void initializeReader();
    }
  };

  const closeMenuModal = () => {
    isOpen = false;
    isAnimating = false;
    pinchGesture = null;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    lockPageScroll(false);
    setBackgroundVideosPaused(false);

    if (document.fullscreenElement && document.exitFullscreen) {
      void document.exitFullscreen().catch(() => {});
    }

    lastFocusedElement?.focus({ preventScroll: true });
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: menuModalScrollY, left: 0, behavior: 'instant' });
    });
  };

  const setZoom = (nextZoom: number) => {
    zoom = Math.min(1.35, Math.max(0.85, Number(nextZoom.toFixed(2))));
    updateZoomState();
  };

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const first = touches[0];
    const second = touches[1];
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  };

  const bindTouchZoom = () => {
    const stopFlipGesture = () => pageFlip?.userStop?.({ x: 0, y: 0 }, true);

    const onTouchStart: EventListener = (rawEvent) => {
      const event = rawEvent as TouchEvent;
      if (event.touches.length < 2) return;
      const distance = getTouchDistance(event.touches);
      if (!distance) return;
      stopFlipGesture();
      pinchGesture = { distance, zoom };
      event.preventDefault();
      event.stopPropagation();
    };

    const onTouchMove: EventListener = (rawEvent) => {
      const event = rawEvent as TouchEvent;
      if (!pinchGesture || event.touches.length < 2) return;
      const distance = getTouchDistance(event.touches);
      if (!distance) return;
      setZoom(pinchGesture.zoom * (distance / pinchGesture.distance));
      event.preventDefault();
      event.stopPropagation();
    };

    const finishPinch: EventListener = (rawEvent) => {
      if (!pinchGesture) return;
      const event = rawEvent as TouchEvent;
      pinchGesture = null;
      event.preventDefault();
      event.stopPropagation();
    };

    const options: AddEventListenerOptions = { passive: false, capture: true };
    addEvent(stage, 'touchstart', onTouchStart, options);
    addEvent(stage, 'touchmove', onTouchMove, options);
    addEvent(stage, 'touchend', finishPinch, options);
    addEvent(stage, 'touchcancel', finishPinch, options);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && modal.requestFullscreen) {
        await modal.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (fullscreenError) {
      console.warn('Tela cheia indisponível neste navegador:', fullscreenError);
    }
  };

  const updateFullscreenLabel = () => {
    if (!fullscreen) return;
    const label = document.fullscreenElement ? 'Sair da tela cheia' : 'Abrir tela cheia';
    fullscreen.setAttribute('aria-label', label);
    fullscreen.setAttribute('title', label);
  };

  const handlePageInput = () => {
    if (pageInput) goToPage(pageInput.value);
  };

  const trapFocus = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !modal.classList.contains('active')) return;
    const focusable = Array.from(modal.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled])'));
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onDocumentClick: EventListener = (rawEvent) => {
    const event = rawEvent as MouseEvent;
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest('.trigger-menu-modal');
    if (!trigger) return;
    event.preventDefault();
    openMenuModal();
  };

  const onModalClick: EventListener = (rawEvent) => {
    if (rawEvent.target === modal) closeMenuModal();
  };

  const onKeyDown: EventListener = (rawEvent) => {
    const event = rawEvent as KeyboardEvent;
    if (!isOpen) return;
    trapFocus(event);

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenuModal();
    } else if (event.key === 'ArrowRight' && document.activeElement !== pageInput) {
      event.preventDefault();
      requestPageFlip('flipNext');
    } else if (event.key === 'ArrowLeft' && document.activeElement !== pageInput) {
      event.preventDefault();
      requestPageFlip('flipPrev');
    } else if (event.key === 'Home' && document.activeElement !== pageInput) {
      event.preventDefault();
      goToPage(1);
    } else if (event.key === 'End' && document.activeElement !== pageInput) {
      event.preventDefault();
      goToPage(totalPages);
    }
  };

  const onResize: EventListener = () => {
    if (!isOpen || !pageFlip) return;
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      updateResponsiveBookMode();
      pageFlip?.update();
      updateCanvasResolution();
      centerCoverPage();
      updateZoomState();
    }, 180);
  };

  addEvent(document, 'click', onDocumentClick);
  if (close) addEvent(close, 'click', closeMenuModal as EventListener);
  if (previous) addEvent(previous, 'click', (() => requestPageFlip('flipPrev')) as EventListener);
  if (next) addEvent(next, 'click', (() => requestPageFlip('flipNext')) as EventListener);
  if (retry) addEvent(retry, 'click', (() => { void initializeReader(); }) as EventListener);
  if (fullscreen) addEvent(fullscreen, 'click', (() => { void toggleFullscreen(); }) as EventListener);
  if (pageInput) {
    addEvent(pageInput, 'change', handlePageInput as EventListener);
    addEvent(pageInput, 'keydown', ((rawEvent: Event) => {
      const event = rawEvent as KeyboardEvent;
      if (event.key === 'Enter') {
        event.preventDefault();
        handlePageInput();
      }
    }) as EventListener);
  }

  bindTouchZoom();
  addEvent(modal, 'click', onModalClick);
  addEvent(document, 'keydown', onKeyDown);
  addEvent(document, 'fullscreenchange', updateFullscreenLabel as EventListener);
  addEvent(window, 'resize', onResize, { passive: true });

  modal.style.display = 'none';
  updateControls();
  updateZoomState();
  window.openMenuModal = openMenuModal;
  window.closeMenuModal = closeMenuModal;

  return () => {
    disposed = true;
    isOpen = false;
    pinchGesture = null;
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    cleanupHandlers.reverse().forEach((cleanup) => cleanup());
    backgroundVideoPlayHandlers.forEach((handler, video) => video.removeEventListener('play', handler));
    backgroundVideoPlayHandlers.clear();
    setBackgroundVideosPaused(false);
    lockPageScroll(false);
    pageFlip?.destroy?.();
    pageFlip = null;
    initializationPromise = null;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    if (window.openMenuModal === openMenuModal) delete window.openMenuModal;
    if (window.closeMenuModal === closeMenuModal) delete window.closeMenuModal;
  };
}
