function normalizePage(page, total) {
    const max = Math.max(1, Number(total) || 1);
    const value = Number.parseInt(page, 10);
    if (!Number.isFinite(value)) return 1;
    return Math.min(max, Math.max(1, value));
}

function getSpread(page, total) {
    const current = normalizePage(page, total);
    const max = Math.max(1, Number(total) || 1);

    if (current === 1) {
        return { current, pages: [1], isCover: true };
    }

    const first = current % 2 === 0 ? current : current - 1;
    const pages = [first];
    if (first + 1 <= max) pages.push(first + 1);

    return { current, pages, isCover: false };
}

function nextPage(page, total) {
    const current = normalizePage(page, total);
    const max = Math.max(1, Number(total) || 1);
    return current === 1 ? Math.min(2, max) : Math.min(current + 2, max);
}

function previousPage(page, total) {
    const current = normalizePage(page, total);
    return current <= 2 ? 1 : current - 2;
}

const PDF_URL = 'assets/CardapioMenu/CARDAPIO_THE_WINE.pdf';
const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const IS_FILE_PROTOCOL = window.location.protocol === 'file:';
const LOCAL_PAGE_IMAGES = Array.from({ length: 12 }, (_, index) => (
    `assets/CardapioMenu/pages/page-${String(index + 1).padStart(2, '0')}.jpg`
));
const MOBILE_BREAKPOINT = 820;
const FLIP_DURATION = 500;

const $ = (id) => document.getElementById(id);

const elements = {
    modal: $('menuModal'),
    card: document.querySelector('#menuModal .menu-modal-card'),
    stage: $('menuFlipbookStage'),
    pages: $('menuFlipbookPages'),
    loading: $('menuPdfLoading'),
    error: $('menuPdfError'),
    retry: $('menuRetryBtn'),
    close: $('menuModalCloseBtn'),
    previous: $('menuPrevBtn'),
    next: $('menuNextBtn'),
    pageInput: $('menuPageInput'),
    pageTotal: $('menuPageTotal'),
    zoomOut: $('menuZoomOut'),
    zoomIn: $('menuZoomIn'),
    fit: $('menuFitBtn'),
    fullscreen: $('menuFullscreenBtn'),
};

let pdfDocument = null;
let imageDocument = null;
let pdfLoadingPromise = null;
let currentPage = 1;
let totalPages = 0;
let zoom = 1;
let isOpen = false;
let isAnimating = false;
let renderVersion = 0;
let resizeTimer = null;
let animationTimer = null;
let touchStartX = null;
let lastFocusedElement = null;

function isMobileViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

function setLoading(visible) {
    if (!elements.loading) return;
    elements.loading.hidden = !visible;
}

function setError(visible) {
    if (!elements.error) return;
    elements.error.hidden = !visible;
}

function updateControls() {
    if (!elements.pageInput || !elements.pageTotal) return;

    elements.pageInput.value = String(currentPage);
    elements.pageInput.max = String(Math.max(totalPages, 1));
    elements.pageTotal.textContent = totalPages ? String(totalPages) : '—';
    elements.previous.disabled = !totalPages || currentPage <= 1 || isAnimating;
    elements.next.disabled = !totalPages || currentPage >= totalPages || isAnimating;
    elements.stage?.setAttribute(
        'aria-label',
        totalPages ? `Leitor do cardápio, página ${currentPage} de ${totalPages}` : 'Leitor do cardápio'
    );
}

function updateZoomState() {
    elements.stage?.classList.toggle('is-zoomed', zoom > 1);
}

async function loadPdfDocument() {
    if (IS_FILE_PROTOCOL) return loadLocalPageDocument();
    if (pdfDocument) return pdfDocument;
    if (pdfLoadingPromise) return pdfLoadingPromise;

    pdfLoadingPromise = (async () => {
        if (!window.pdfjsLib) {
            throw new Error('PDF.js não está disponível.');
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        const documentProxy = await window.pdfjsLib.getDocument(PDF_URL).promise;
        pdfDocument = documentProxy;
        totalPages = documentProxy.numPages;
        currentPage = normalizePage(currentPage, totalPages);
        updateControls();
        return documentProxy;
    })();

    try {
        return await pdfLoadingPromise;
    } finally {
        pdfLoadingPromise = null;
    }
}

function loadLocalPageImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Página local indisponível: ${src}`));
        image.src = src;
    });
}

async function loadLocalPageDocument() {
    if (imageDocument) return imageDocument;
    if (pdfLoadingPromise) return pdfLoadingPromise;

    pdfLoadingPromise = (async () => {
        const pages = await Promise.all(LOCAL_PAGE_IMAGES.map(loadLocalPageImage));
        imageDocument = { pages, numPages: pages.length };
        totalPages = imageDocument.numPages;
        currentPage = normalizePage(currentPage, totalPages);
        updateControls();
        return imageDocument;
    })();

    try {
        return await pdfLoadingPromise;
    } finally {
        pdfLoadingPromise = null;
    }
}

function getPageRenderSize(width, height, spreadSize) {
    const stageRect = elements.pages.getBoundingClientRect();
    const availableHeight = Math.max(260, stageRect.height - 18);
    const availableWidth = isMobileViewport()
        ? Math.max(180, stageRect.width - 8)
        : spreadSize === 2
            ? Math.max(180, (stageRect.width - 8) / 2)
            : Math.max(220, stageRect.width * 0.66);
    const fitScale = Math.min(availableWidth / width, availableHeight / height);

    return {
        width: Math.max(1, Math.floor(width * Math.max(0.1, fitScale * zoom))),
        height: Math.max(1, Math.floor(height * Math.max(0.1, fitScale * zoom))),
    };
}

async function renderPageCanvas(pageNumber, spreadSize) {
    const outputScale = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });

    canvas.className = 'pdf-page-canvas';

    if (imageDocument) {
        const image = imageDocument.pages[pageNumber - 1];
        if (!image) throw new Error(`Página local não encontrada: ${pageNumber}`);

        const size = getPageRenderSize(image.naturalWidth, image.naturalHeight, spreadSize);
        canvas.width = Math.floor(size.width * outputScale);
        canvas.height = Math.floor(size.height * outputScale);
        canvas.style.width = `${size.width}px`;
        canvas.style.height = `${size.height}px`;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    const page = await pdfDocument.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const fitScale = getPageRenderSize(baseViewport.width, baseViewport.height, spreadSize);
    const viewport = page.getViewport({
        scale: fitScale.width / baseViewport.width,
    });
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    await page.render({
        canvasContext: context,
        viewport,
        ...(outputScale !== 1 ? { transform: [outputScale, 0, 0, outputScale, 0, 0] } : {}),
    }).promise;

    return canvas;
}

function visiblePagesForSpread(spread) {
    if (!isMobileViewport() || spread.pages.length === 1) {
        return spread.pages;
    }

    return [spread.pages.includes(currentPage) ? currentPage : spread.pages[0]];
}

async function renderCurrentSpread({ showLoader = false } = {}) {
    if ((!pdfDocument && !imageDocument) || !elements.pages) return;

    const version = ++renderVersion;
    const spread = getSpread(currentPage, totalPages);
    const visiblePages = visiblePagesForSpread(spread);

    if (showLoader) setLoading(true);
    setError(false);

    const canvases = await Promise.all(
        visiblePages.map((pageNumber) => renderPageCanvas(pageNumber, visiblePages.length))
    );

    if (version !== renderVersion) return;

    const pageElements = canvases.map((canvas, index) => {
        const pageNumber = visiblePages[index];
        const pageElement = document.createElement('article');
        const side = visiblePages.length === 1
            ? 'is-cover'
            : index === 0
                ? 'is-left'
                : 'is-right';

        pageElement.className = `flipbook-page ${side}`;
        pageElement.dataset.page = String(pageNumber);
        pageElement.setAttribute('aria-label', `Página ${pageNumber}`);
        pageElement.appendChild(canvas);
        return pageElement;
    });

    elements.pages.replaceChildren(...pageElements);
    setLoading(false);
    updateControls();
}

function animatePageTurn(direction) {
    if (!elements.pages || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const className = direction === 'previous'
        ? 'is-turning-previous'
        : 'is-turning-next';

    window.clearTimeout(animationTimer);
    elements.pages.classList.remove('is-turning-next', 'is-turning-previous');
    void elements.pages.offsetWidth;
    elements.pages.classList.add(className);
    animationTimer = window.setTimeout(() => {
        elements.pages.classList.remove(className);
    }, FLIP_DURATION);
}

async function goToPage(targetPage, direction = 'next') {
    if (!totalPages || isAnimating) return;

    const target = normalizePage(targetPage, totalPages);
    if (target === currentPage && elements.pages.children.length > 0) return;

    const previous = currentPage;
    isAnimating = true;
    currentPage = target;
    updateControls();

    try {
        await renderCurrentSpread();
        animatePageTurn(direction);
    } catch (error) {
        currentPage = previous;
        console.error('Erro ao renderizar página do cardápio:', error);
        setError(true);
        setLoading(false);
    } finally {
        isAnimating = false;
        updateControls();
    }
}

async function initializeReader() {
    if (!elements.pages) return;

    setError(false);
    setLoading(true);

    try {
        await loadPdfDocument();
        await renderCurrentSpread();
    } catch (error) {
        console.error('Erro ao carregar o cardápio:', error);
        setLoading(false);
        setError(true);
    }
}

function lockPageScroll(locked) {
    document.documentElement.classList.toggle('menu-modal-open', locked);
    document.body.classList.toggle('menu-modal-open', locked);
    document.body.style.overflow = locked ? 'hidden' : '';
    document.documentElement.style.overflow = locked ? 'hidden' : '';
}

function openMenuModal() {
    if (!elements.modal) return;

    lastFocusedElement = document.activeElement;
    isOpen = true;
    elements.modal.style.display = 'flex';
    elements.modal.classList.add('active');
    elements.modal.setAttribute('aria-hidden', 'false');
    lockPageScroll(true);
    elements.stage?.focus({ preventScroll: true });

    if (pdfDocument || imageDocument) {
        renderCurrentSpread({ showLoader: elements.pages.children.length === 0 }).catch((error) => {
            console.error('Erro ao renderizar o cardápio:', error);
            setError(true);
            setLoading(false);
        });
    } else {
        initializeReader();
    }
}

function closeMenuModal() {
    if (!elements.modal) return;

    isOpen = false;
    isAnimating = false;
    window.clearTimeout(animationTimer);
    elements.modal.classList.remove('active');
    elements.modal.setAttribute('aria-hidden', 'true');
    elements.modal.style.display = 'none';
    lockPageScroll(false);

    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
    }

    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus({ preventScroll: true });
    }
}

function setZoom(nextZoom) {
    zoom = Math.min(1.45, Math.max(0.8, Number(nextZoom.toFixed(2))));
    updateZoomState();
    if ((pdfDocument || imageDocument) && isOpen) {
        renderCurrentSpread().catch((error) => {
            console.error('Erro ao aplicar zoom no cardápio:', error);
            setError(true);
        });
    }
}

async function toggleFullscreen() {
    if (!elements.modal) return;

    try {
        if (!document.fullscreenElement && elements.modal.requestFullscreen) {
            await elements.modal.requestFullscreen();
        } else if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen();
        }
    } catch (error) {
        console.warn('Tela cheia indisponível neste navegador:', error);
    }
}

function updateFullscreenLabel() {
    if (!elements.fullscreen) return;
    elements.fullscreen.textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
}

function handlePageInput() {
    const requestedPage = normalizePage(elements.pageInput.value, totalPages);
    const direction = requestedPage < currentPage ? 'previous' : 'next';
    goToPage(requestedPage, direction);
}

function trapFocus(event) {
    if (event.key !== 'Tab' || !elements.modal?.classList.contains('active')) return;

    const focusable = Array.from(elements.modal.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled])'
    ));
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
}

function bindEvents() {
    if (!elements.modal) return;

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('.trigger-menu-modal');
        if (!trigger) return;
        event.preventDefault();
        openMenuModal();
    });

    elements.close?.addEventListener('click', closeMenuModal);
    elements.previous?.addEventListener('click', () => goToPage(previousPage(currentPage, totalPages), 'previous'));
    elements.next?.addEventListener('click', () => goToPage(nextPage(currentPage, totalPages), 'next'));
    elements.retry?.addEventListener('click', initializeReader);
    elements.zoomOut?.addEventListener('click', () => setZoom(zoom - 0.1));
    elements.zoomIn?.addEventListener('click', () => setZoom(zoom + 0.1));
    elements.fit?.addEventListener('click', () => setZoom(1));
    elements.fullscreen?.addEventListener('click', toggleFullscreen);
    elements.pageInput?.addEventListener('change', handlePageInput);
    elements.pageInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handlePageInput();
        }
    });

    elements.modal.addEventListener('click', (event) => {
        if (event.target === elements.modal) closeMenuModal();
    });

    elements.stage?.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });

    elements.stage?.addEventListener('touchend', (event) => {
        if (touchStartX === null) return;
        const deltaX = event.changedTouches[0].clientX - touchStartX;
        touchStartX = null;
        if (Math.abs(deltaX) < 45) return;
        if (deltaX < 0) {
            goToPage(nextPage(currentPage, totalPages), 'next');
        } else {
            goToPage(previousPage(currentPage, totalPages), 'previous');
        }
    }, { passive: true });

    document.addEventListener('keydown', (event) => {
        if (!isOpen) return;
        trapFocus(event);

        if (event.key === 'Escape') {
            event.preventDefault();
            closeMenuModal();
        } else if (event.key === 'ArrowRight' && document.activeElement !== elements.pageInput) {
            event.preventDefault();
            goToPage(nextPage(currentPage, totalPages), 'next');
        } else if (event.key === 'ArrowLeft' && document.activeElement !== elements.pageInput) {
            event.preventDefault();
            goToPage(previousPage(currentPage, totalPages), 'previous');
        } else if (event.key === 'Home' && document.activeElement !== elements.pageInput) {
            event.preventDefault();
            goToPage(1, 'previous');
        } else if (event.key === 'End' && document.activeElement !== elements.pageInput) {
            event.preventDefault();
            goToPage(totalPages, 'next');
        }
    });

    document.addEventListener('fullscreenchange', updateFullscreenLabel);
    window.addEventListener('resize', () => {
        if (!isOpen || (!pdfDocument && !imageDocument)) return;
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            renderCurrentSpread().catch((error) => {
                console.error('Erro ao redimensionar o cardápio:', error);
                setError(true);
            });
        }, 180);
    }, { passive: true });
}

if (elements.modal) {
    elements.modal.style.display = 'none';
    updateControls();
    updateZoomState();
    bindEvents();
    window.openMenuModal = openMenuModal;
    window.closeMenuModal = closeMenuModal;
}
