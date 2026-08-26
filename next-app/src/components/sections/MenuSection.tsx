export function MenuSection() {
  return (
    <section id="cardapio" className="cardapio-split-section parallax-container">
      <div className="cardapio-left-cream">
        <div className="cardapio-left-content reveal-up parallax-element" data-parallax-speed="0.10">
          <span className="split-tag">— MENU —</span>
          <h2 className="split-title">
            Confira o <br />Nosso <span className="italic-script">Cardápio</span>
          </h2>
          <p>Pratos autorais elaborados com ingredientes selecionados e apresentação impecável.</p>
          <button className="btn-cardapio trigger-menu-modal" type="button">VER CARDÁPIO</button>
        </div>
      </div>

      <div className="cardapio-right-video">
        <video autoPlay muted loop playsInline className="parallax-img" data-parallax-speed="0.25">
          <source src="/assets/CardapioMenu/video-cardapio.mp4" type="video/mp4" />
        </video>
      </div>

      <img
        className="cardapio-menu-float trigger-menu-modal"
        src="/assets/CardapioMenu/MENU-THE-WINE-MOCKUP.webp"
        alt="Abrir cardápio The Wine Experience"
        style={{ cursor: 'pointer' }}
      />
    </section>
  );
}
