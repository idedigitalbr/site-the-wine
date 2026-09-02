import { Brackets } from 'lucide-react';

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
          <Brackets className="bracket-svg bracket-left" aria-hidden="true" stroke="var(--wine-gold)" strokeWidth={1.2} />

          <p className="highlighted-text">
            Um ambiente sofisticado para brindar,<br />compartilhar e viver novas experiências.
          </p>

          <Brackets className="bracket-svg bracket-right" aria-hidden="true" stroke="var(--wine-gold)" strokeWidth={1.2} />
        </div>

        <div className="divider-glow reveal-up" style={{ transitionDelay: '0.25s', marginTop: '2rem' }} />
      </div>
    </section>
  );
}
