import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { galleryItems } from '@/config/content';

export function GallerySection() {
  return (
    <>
      <section className="gallery" id="galeria" aria-label="Álbum de fotografias do The Wine Experience">
        <button className="gallery-arrow gallery-arrow-left" aria-label="Fotografia anterior">
          <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
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
          <ChevronRight aria-hidden="true" strokeWidth={1.5} />
        </button>
      </section>

      <div className="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Visualizador de fotografias">
        <button className="lightbox-close" id="lightboxClose" aria-label="Fechar galeria">
          <X aria-hidden="true" strokeWidth={1.5} />
        </button>

        <button className="lightbox-nav lightbox-prev" id="lightboxPrev" aria-label="Fotografia anterior">
          <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
        </button>

        <figure className="lightbox-content">
          <img
            className="lightbox-image"
            id="lightboxImage"
            src={undefined}
            alt=""
          />
          <figcaption className="lightbox-counter" id="lightboxCounter" />
        </figure>

        <button className="lightbox-nav lightbox-next" id="lightboxNext" aria-label="Próxima fotografia">
          <ChevronRight aria-hidden="true" strokeWidth={1.5} />
        </button>
      </div>
    </>
  );
}
