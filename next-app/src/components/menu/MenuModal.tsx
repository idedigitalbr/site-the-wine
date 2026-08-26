import { ChevronLeft, ChevronRight, Download, Maximize2, X } from 'lucide-react';
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
              <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
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
                <Maximize2 aria-hidden="true" strokeWidth={1.5} />
              </button>

              <a
                id="menuDownloadBtn"
                className="flipbook-icon-button"
                href={menuPages.pdf}
                download
                aria-label="Baixar PDF"
                title="Baixar PDF"
              >
                <Download aria-hidden="true" strokeWidth={1.5} />
              </a>

              <button
                className="flipbook-icon-button flipbook-nav flipbook-toolbar-nav flipbook-nav-next"
                id="menuNextBtn"
                type="button"
                aria-label="Próxima página"
              >
              <ChevronRight aria-hidden="true" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <button className="menu-modal-close" id="menuModalCloseBtn" type="button" aria-label="Fechar cardápio">
            <X aria-hidden="true" strokeWidth={2.8} />
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
