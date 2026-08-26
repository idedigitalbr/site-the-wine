import { galleryItems } from '@/config/content';

export function GallerySection() {
  return (
    <>
      <section className="gallery" id="galeria" aria-label="Álbum de fotografias do The Wine Experience">
        <button className="gallery-arrow gallery-arrow-left" aria-label="Fotografia anterior">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <div className="gallery-viewport">
          <div className="gallery-track" id="galleryTrack">
            {galleryItems.map((item, index) => (
              <button
                className="gallery-item"
                data-index={index}
                type="button"
                aria-label="Ver fotografia em tela cheia"
                key={item.src}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </button>
            ))}
          </div>
        </div>

        <button className="gallery-arrow gallery-arrow-right" aria-label="Próxima fotografia">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </section>

      <div className="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Visualizador de fotografias">
        <button className="lightbox-close" id="lightboxClose" aria-label="Fechar galeria">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <button className="lightbox-nav lightbox-prev" id="lightboxPrev" aria-label="Fotografia anterior">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <figure className="lightbox-content">
          <img className="lightbox-image" id="lightboxImage" src="" alt="" />
          <figcaption className="lightbox-counter" id="lightboxCounter" />
        </figure>

        <button className="lightbox-nav lightbox-next" id="lightboxNext" aria-label="Próxima fotografia">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </>
  );
}
