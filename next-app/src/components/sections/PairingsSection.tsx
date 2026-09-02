export function PairingsSection() {
  return (
    <section id="gastronomia" className="split-section-v2 parallax-container">
      <div className="split-v2-img-left reveal-up">
        <img
          src="/assets/S3 Harmonizacoes/S3 Harmonizacoes-FotoHorizontal.webp"
          className="parallax-img-h"
          data-parallax-direction="horizontal"
          data-parallax-speed="0.35"
          alt="Harmonizações Exclusivas The Wine Experience"
        />
      </div>

      <div className="split-v2-content reveal-up parallax-element" data-parallax-speed="0.10" style={{ transitionDelay: '0.1s' }}>
        <span className="split-tag">THE WINE - XPERIENCE</span>
        <h2 className="split-title">
          Cada detalhe pensado para <br /><span className="italic-script">encantar</span> seu paladar
        </h2>
        <p className="split-text">
          Nossos sommeliers e chefs unem técnica, sensibilidade e curadoria para criar combinações que valorizam cada prato, cada rótulo e cada momento.
        </p>

        <div style={{ alignSelf: 'flex-start' }}>
          <a
            href="/reservas"
            className="btn-gold-outline"
          >
            FAÇA SUA RESERVA
          </a>
        </div>
      </div>

      <div className="split-v2-img-right reveal-up">
        <img
          src="/assets/S3 Harmonizacoes/S3-TACA-VINHO.webp"
          className="parallax-img"
          data-parallax-speed="0.38"
          alt="Taça de vinho tinto sendo servida"
        />
      </div>
    </section>
  );
}
