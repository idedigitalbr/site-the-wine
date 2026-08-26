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
        <span className="split-tag">O que você encontrará no The Wine</span>
        <h2 className="split-title">
          Cada detalhe pensado para <br /><span className="italic-script">encantar</span> seu paladar
        </h2>
        <p className="split-text">
          Nossos sommeliers e chefs unem técnica, sensibilidade e curadoria para criar combinações que valorizam cada prato, cada rótulo e cada momento.
        </p>

        <div style={{ alignSelf: 'flex-start' }}>
          <a
            href="https://api.whatsapp.com/send?phone=5591984040710&text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20uma%20reserva%20no%20The%20Wine%20Experience."
            target="_blank"
            rel="noopener noreferrer"
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
