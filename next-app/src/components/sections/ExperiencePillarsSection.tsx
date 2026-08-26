import { ChefHat, Lamp, Wine } from 'lucide-react';

export function ExperiencePillarsSection() {
  return (
    <section id="experiencia" className="mvv-section">
      <div className="mvv-outer-container">
        <div className="mvv-grid">
          <div className="mvv-column parallax-container">
            <img
              src="/assets/Gastronomia/prato-carne-grelhada-gnocchi.webp"
              className="mvv-bg-img parallax-img"
              data-parallax-speed="0.25"
              alt="Gastronomia The Wine Experience"
            />
            <div className="mvv-column-overlay" />
            <div className="mvv-card parallax-element" data-parallax-speed="-0.10">
              <div className="mvv-icon">
                <ChefHat aria-hidden="true" strokeWidth={1.2} />
              </div>
              <div className="mvv-divider">
                <span className="line" />
                <span className="diamond" />
                <span className="line" />
              </div>
              <h3>Gastronomia</h3>
              <p>Menu autoral pensado para realçar sabores e transformar cada encontro em uma experiência memorável.</p>
            </div>
          </div>

          <div className="mvv-column parallax-container">
            <img
              src="/assets/Vinhos/garrafas-vinho-cartuxa-tapada.webp"
              className="mvv-bg-img parallax-img"
              data-parallax-speed="-0.25"
              alt="Carta de Vinhos The Wine Experience"
            />
            <div className="mvv-column-overlay" />
            <div className="mvv-card parallax-element" data-parallax-speed="0.14">
              <div className="mvv-icon">
                <Wine aria-hidden="true" strokeWidth={1.2} />
              </div>
              <div className="mvv-divider">
                <span className="line" />
                <span className="diamond" />
                <span className="line" />
              </div>
              <h3>Carta de Vinhos</h3>
              <p>Curadoria especial de rótulos nacionais e internacionais para harmonizações sofisticadas e momentos especiais.</p>
            </div>
          </div>

          <div className="mvv-column parallax-container">
            <img
              src="/assets/Ambiente/mesa-reservada-adega.webp"
              className="mvv-bg-img parallax-img"
              data-parallax-speed="0.30"
              alt="Ambiente Reservado Adega The Wine Experience"
            />
            <div className="mvv-column-overlay" />
            <div className="mvv-card parallax-element" data-parallax-speed="-0.08">
              <div className="mvv-icon">
                <Lamp aria-hidden="true" strokeWidth={1.2} />
              </div>
              <div className="mvv-divider">
                <span className="line" />
                <span className="diamond" />
                <span className="line" />
              </div>
              <h3>Ambiente</h3>
              <p>Atmosfera intimista e acolhedora, perfeita para brindar, desacelerar e celebrar bons encontros.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
