export function HeroSection() {
  return (
    <section id="home" className="hero parallax-container" data-parallax-speed="0.38">
      <div className="hero-bg">
        <video autoPlay loop muted playsInline preload="auto" className="parallax-img" data-parallax-speed="0.38">
          <source src="/assets/S1 TOPO HERO/video-web-horizontal.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="hero-overlay-dark" />

      <div className="hero-content parallax-element" data-parallax-speed="-0.14">
        <div className="hero-logo">
          <img src="/assets/Logos/logo_the_wine_branco_dourado_transparente.webp" alt="THE WINE Xperience Logo" />
        </div>

        <div className="hero-divider">
          <span className="line" />
          <span className="diamonds">◆ ◆ ◆</span>
          <span className="line" />
        </div>
      </div>

      <div className="hero-explore-indicator">
        <div className="mouse-icon">
          <div className="mouse-wheel" />
        </div>
        <span>Role para saber mais...</span>
        <div className="hero-explore-line" />
      </div>
    </section>
  );
}
