import { menuPages } from '@/config/content';

export function MenuModal() {
  return (
    <div
      className="modal-overlay menu-modal-overlay"
      id="menuModal"
      role="dialog"
      aria-modal="true"
      aria-label="Cardápio The Wine Experience"
      aria-hidden="true"
    >
      <div className="menu-modal-card" role="document">
        <div className="flipbook-header">
          <img
            className="flipbook-brand-logo"
            src="/assets/Logos/logo_the_wine_branco_dourado_transparente.webp"
            alt="The Wine Experience"
          />

          <div className="flipbook-toolbar" aria-label="Controles do cardápio">
            <button
              className="flipbook-icon-button flipbook-nav flipbook-toolbar-nav flipbook-nav-prev"
              id="menuPrevBtn"
              type="button"
              aria-label="Página anterior"
            >
              ‹
            </button>

            <label className="flipbook-page-control">
              <span>Página</span>
              <input id="menuPageInput" type="number" min="1" defaultValue="1" aria-label="Número da página" />
              <span>/ <strong id="menuPageTotal">—</strong></span>
            </label>

            <div className="flipbook-tool-group flipbook-tool-group-end">
              <button
                id="menuFullscreenBtn"
                className="flipbook-icon-button"
                type="button"
                aria-label="Abrir tela cheia"
                title="Abrir tela cheia"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
                </svg>
              </button>

              <a
                id="menuDownloadBtn"
                className="flipbook-icon-button"
                href={menuPages.pdf}
                download
                aria-label="Baixar PDF"
                title="Baixar PDF"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
                </svg>
              </a>

              <button
                className="flipbook-icon-button flipbook-nav flipbook-toolbar-nav flipbook-nav-next"
                id="menuNextBtn"
                type="button"
                aria-label="Próxima página"
              >
                ›
              </button>
            </div>
          </div>

          <button className="menu-modal-close" id="menuModalCloseBtn" type="button" aria-label="Fechar cardápio">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flipbook-reader" id="menuFlipbookStage" tabIndex={0} aria-label="Leitor do cardápio">
          <div className="flipbook-page-area" id="menuFlipbookPages" aria-live="polite" />

          <div className="menu-pdf-loading" id="menuPdfLoading" role="status">
            <span className="pdf-spinner" aria-hidden="true" />
            <span>Carregando cardápio...</span>
          </div>

          <div className="menu-pdf-error" id="menuPdfError" role="alert" hidden>
            <strong>Não foi possível carregar o cardápio.</strong>
            <span>Verifique sua conexão ou baixe o PDF para continuar.</span>
            <div className="flipbook-error-actions">
              <button id="menuRetryBtn" type="button">Tentar novamente</button>
              <a href={menuPages.pdf} download>Baixar PDF</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
