import type { Cleanup } from './types';

export function setupGalleryLightbox(): Cleanup {
  const gallery = document.querySelector<HTMLElement>('.gallery');
  const track = document.getElementById('galleryTrack');
  const arrowLeft = document.querySelector<HTMLElement>('.gallery-arrow-left');
  const arrowRight = document.querySelector<HTMLElement>('.gallery-arrow-right');

  if (!gallery || !track) return () => {};

  const originalItems = Array.from(track.children) as HTMLElement[];
  const totalOriginal = originalItems.length;
  if (!totalOriginal) return () => {};

  const imageSources = originalItems.map(
    (item) => item.querySelector<HTMLImageElement>('img')?.src ?? '',
  );
  const imageAlts = originalItems.map(
    (item) => item.querySelector<HTMLImageElement>('img')?.alt ?? '',
  );

  const clones: HTMLElement[] = [];
  for (let set = 0; set < 2; set += 1) {
    originalItems.forEach((item) => {
      const clone = item.cloneNode(true) as HTMLElement;
      clones.push(clone);
      track.appendChild(clone);
    });
  }

  const allItems = Array.from(track.children) as HTMLElement[];

  let scrollPosition = 0;
  let autoSpeed = 0.5;
  let isAutoScrolling = true;
  let isDragging = false;
  let startX = 0;
  let dragStartScroll = 0;
  let rafId = 0;
  let resumeTimeout = 0;
  let resizeTimeout = 0;
  let destroyed = false;

  const getSetWidth = () => {
    let width = 0;
    for (let index = 0; index < totalOriginal; index += 1) {
      width += allItems[index]?.offsetWidth ?? 0;
    }
    return width;
  };

  let setWidth = getSetWidth();
  scrollPosition = setWidth;
  track.style.transform = `translateX(${-scrollPosition}px)`;

  const autoScroll = () => {
    if (destroyed) return;

    if (isAutoScrolling && !isDragging && setWidth > 0) {
      scrollPosition += autoSpeed;

      if (scrollPosition >= setWidth * 2) scrollPosition -= setWidth;
      if (scrollPosition < 0) scrollPosition += setWidth;

      track.style.transform = `translateX(${-scrollPosition}px)`;
    }

    rafId = window.requestAnimationFrame(autoScroll);
  };

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  if (!prefersReducedMotion) {
    rafId = window.requestAnimationFrame(autoScroll);
  }

  const pauseAutoScroll = () => {
    isAutoScrolling = false;
    if (resumeTimeout) window.clearTimeout(resumeTimeout);
  };

  const scheduleResume = (delay = 3000) => {
    if (resumeTimeout) window.clearTimeout(resumeTimeout);
    resumeTimeout = window.setTimeout(() => {
      isAutoScrolling = true;
    }, delay);
  };

  const handleMouseEnter = () => {
    autoSpeed = 0.25;
  };

  const handleMouseLeave = () => {
    autoSpeed = 0.5;
  };

  const getAverageItemWidth = () => setWidth / totalOriginal;

  const smoothScrollTo = (target: number, duration = 500) => {
    const start = scrollPosition;
    const diff = target - start;
    const startTime = performance.now();

    pauseAutoScroll();

    const step = (currentTime: number) => {
      if (destroyed) return;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      scrollPosition = start + diff * ease;

      if (scrollPosition >= setWidth * 2) scrollPosition -= setWidth;
      if (scrollPosition < 0) scrollPosition += setWidth;

      track.style.transform = `translateX(${-scrollPosition}px)`;

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        scheduleResume();
      }
    };

    window.requestAnimationFrame(step);
  };

  const handleArrowLeft = () => {
    smoothScrollTo(scrollPosition - getAverageItemWidth());
  };

  const handleArrowRight = () => {
    smoothScrollTo(scrollPosition + getAverageItemWidth());
  };

  const handleDragStart = (x: number) => {
    isDragging = true;
    startX = x;
    dragStartScroll = scrollPosition;
    pauseAutoScroll();
    gallery.style.cursor = 'grabbing';
  };

  const handleDragMove = (x: number) => {
    if (!isDragging || setWidth <= 0) return;

    const diff = startX - x;
    scrollPosition = dragStartScroll + diff;

    if (scrollPosition >= setWidth * 2) scrollPosition -= setWidth;
    if (scrollPosition < 0) scrollPosition += setWidth;

    track.style.transform = `translateX(${-scrollPosition}px)`;
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    gallery.style.cursor = 'grab';
    scheduleResume();
  };

  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    handleDragStart(event.clientX);
  };

  const handleMouseMove = (event: MouseEvent) => handleDragMove(event.clientX);

  let touchStartX = 0;
  let touchStartY = 0;
  let touchIntentDecided = false;
  let isHorizontalTouch = false;

  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchIntentDecided = false;
    isHorizontalTouch = false;
    handleDragStart(touch.clientX);
  };

  const handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;

    if (!touchIntentDecided) {
      const dx = Math.abs(touch.clientX - touchStartX);
      const dy = Math.abs(touch.clientY - touchStartY);
      if (dx > 6 || dy > 6) {
        touchIntentDecided = true;
        isHorizontalTouch = dx >= dy;
        if (!isHorizontalTouch) {
          isDragging = false;
          scheduleResume();
          return;
        }
      }
    }

    if (isHorizontalTouch) {
      handleDragMove(touch.clientX);
    }
  };

  const handleTouchEnd = () => {
    touchIntentDecided = false;
    isHorizontalTouch = false;
    handleDragEnd();
  };

  const handleResize = () => {
    if (resizeTimeout) window.clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      setWidth = getSetWidth();
    }, 200);
  };

  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage') as HTMLImageElement | null;
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  let currentLightboxIndex = 0;
  let lightboxSwapTimeout = 0;

  const updateLightboxImage = () => {
    if (!lightboxImage) return;

    lightboxImage.style.opacity = '0';
    lightboxImage.style.transform = 'scale(0.96)';

    if (lightboxSwapTimeout) window.clearTimeout(lightboxSwapTimeout);
    lightboxSwapTimeout = window.setTimeout(() => {
      lightboxImage.src = imageSources[currentLightboxIndex] ?? '';
      lightboxImage.alt = imageAlts[currentLightboxIndex] ?? '';
      if (lightboxCounter) {
        lightboxCounter.textContent = `${String(currentLightboxIndex + 1).padStart(2, '0')} / ${String(totalOriginal).padStart(2, '0')}`;
      }
      lightboxImage.style.opacity = '1';
      lightboxImage.style.transform = 'scale(1)';
    }, 150);
  };

  const openLightbox = (index: number) => {
    if (!lightbox) return;
    currentLightboxIndex = index;
    updateLightboxImage();
    lightbox.classList.add('active');
    document.body.classList.add('lightbox-open');
  };

  const closeLightbox = () => {
    lightbox?.classList.remove('active');
    document.body.classList.remove('lightbox-open');
  };

  const nextImage = () => {
    currentLightboxIndex = (currentLightboxIndex + 1) % totalOriginal;
    updateLightboxImage();
  };

  const previousImage = () => {
    currentLightboxIndex =
      (currentLightboxIndex - 1 + totalOriginal) % totalOriginal;
    updateLightboxImage();
  };

  const handleTrackClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const item = target.closest<HTMLElement>('.gallery-item');
    if (!item) return;

    const movedDistance = Math.abs(scrollPosition - dragStartScroll);
    if (movedDistance > 5) return;

    const index = Number.parseInt(item.dataset.index ?? '', 10);
    if (Number.isFinite(index) && index >= 0 && index < totalOriginal) {
      openLightbox(index);
    }
  };

  let lightboxTouchStartX = 0;
  let lightboxTouchStartY = 0;

  const handleLightboxTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    lightboxTouchStartX = touch.clientX;
    lightboxTouchStartY = touch.clientY;
  };

  const handleLightboxTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    const diffX = touch.clientX - lightboxTouchStartX;
    const diffY = touch.clientY - lightboxTouchStartY;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      if (diffX < 0) {
        nextImage();
      } else {
        previousImage();
      }
    } else if (diffY > 75 && Math.abs(diffY) > Math.abs(diffX) * 1.5) {
      closeLightbox();
    }
  };

  const handleLightboxOverlay = (event: MouseEvent) => {
    if (event.target === lightbox) closeLightbox();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!lightbox?.classList.contains('active')) return;

    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') previousImage();
    if (event.key === 'ArrowRight') nextImage();
  };

  gallery.addEventListener('mouseenter', handleMouseEnter);
  gallery.addEventListener('mouseleave', handleMouseLeave);
  gallery.addEventListener('mousedown', handleMouseDown);
  gallery.addEventListener('touchstart', handleTouchStart, { passive: true });
  gallery.addEventListener('touchmove', handleTouchMove, { passive: true });
  gallery.addEventListener('touchend', handleTouchEnd);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleDragEnd);
  window.addEventListener('resize', handleResize);
  arrowLeft?.addEventListener('click', handleArrowLeft);
  arrowRight?.addEventListener('click', handleArrowRight);
  track.addEventListener('click', handleTrackClick);
  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxPrev?.addEventListener('click', previousImage);
  lightboxNext?.addEventListener('click', nextImage);
  lightbox?.addEventListener('click', handleLightboxOverlay);
  lightbox?.addEventListener('touchstart', handleLightboxTouchStart, { passive: true });
  lightbox?.addEventListener('touchend', handleLightboxTouchEnd, { passive: true });
  document.addEventListener('keydown', handleKeyDown);

  return () => {
    destroyed = true;
    if (rafId) window.cancelAnimationFrame(rafId);
    if (resumeTimeout) window.clearTimeout(resumeTimeout);
    if (resizeTimeout) window.clearTimeout(resizeTimeout);
    if (lightboxSwapTimeout) window.clearTimeout(lightboxSwapTimeout);

    gallery.removeEventListener('mouseenter', handleMouseEnter);
    gallery.removeEventListener('mouseleave', handleMouseLeave);
    gallery.removeEventListener('mousedown', handleMouseDown);
    gallery.removeEventListener('touchstart', handleTouchStart);
    gallery.removeEventListener('touchmove', handleTouchMove);
    gallery.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('resize', handleResize);
    arrowLeft?.removeEventListener('click', handleArrowLeft);
    arrowRight?.removeEventListener('click', handleArrowRight);
    track.removeEventListener('click', handleTrackClick);
    lightboxClose?.removeEventListener('click', closeLightbox);
    lightboxPrev?.removeEventListener('click', previousImage);
    lightboxNext?.removeEventListener('click', nextImage);
    lightbox?.removeEventListener('click', handleLightboxOverlay);
    lightbox?.removeEventListener('touchstart', handleLightboxTouchStart);
    lightbox?.removeEventListener('touchend', handleLightboxTouchEnd);
    document.removeEventListener('keydown', handleKeyDown);

    closeLightbox();
    clones.forEach((clone) => clone.remove());
    track.style.removeProperty('transform');
    gallery.style.removeProperty('cursor');
  };
}
