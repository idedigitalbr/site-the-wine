export function AboutSection() {
  return (
    <section id="sobre" className="historia-section">
      <img src="/assets/S2 Sobre Nossa Historia/bg-sobernoszinho-internet.webp" className="historia-bg-img" alt="Nossa História" />
      <div className="historia-content">
        <h2 className="historia-headline reveal-up" style={{ transitionDelay: '0.05s' }}>THE WINE EXPERIENCE</h2>

        <p className="historia-paragraph reveal-up" style={{ transitionDelay: '0.1s' }}>
          No coração de Belém, um ambiente acolhedor reúne gastronomia autoral, uma seleção criteriosa de vinhos e harmonizações que transformam cada visita em um momento especial.
        </p>

        <div className="divider-diamond reveal-up" style={{ transitionDelay: '0.15s' }}>
          <span className="line left" />
          <span className="diamond" />
          <span className="line right" />
        </div>

        <div className="highlighted-container reveal-up" style={{ transitionDelay: '0.2s' }}>
          <svg className="bracket-svg bracket-left" width="30" height="90" viewBox="0 0 30 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M 28 8 L 8 8 L 8 82 L 28 82" stroke="var(--wine-gold)" strokeWidth="1.2" strokeLinecap="square" />
            <circle cx="8" cy="8" r="2.5" fill="var(--wine-gold)" />
            <circle cx="8" cy="82" r="2.5" fill="var(--wine-gold)" />
            <circle cx="28" cy="8" r="1.5" fill="var(--wine-gold)" />
            <circle cx="28" cy="82" r="1.5" fill="var(--wine-gold)" />
          </svg>

          <p className="highlighted-text">
            Um ambiente sofisticado para brindar,<br />compartilhar e viver novas experiências.
          </p>

          <svg className="bracket-svg bracket-right" width="30" height="90" viewBox="0 0 30 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M 2 8 L 22 8 L 22 82 L 2 82" stroke="var(--wine-gold)" strokeWidth="1.2" strokeLinecap="square" />
            <circle cx="22" cy="8" r="2.5" fill="var(--wine-gold)" />
            <circle cx="22" cy="82" r="2.5" fill="var(--wine-gold)" />
            <circle cx="2" cy="8" r="1.5" fill="var(--wine-gold)" />
            <circle cx="2" cy="82" r="1.5" fill="var(--wine-gold)" />
          </svg>
        </div>

        <div className="divider-glow reveal-up" style={{ transitionDelay: '0.25s', marginTop: '2rem' }} />
      </div>
    </section>
  );
}

