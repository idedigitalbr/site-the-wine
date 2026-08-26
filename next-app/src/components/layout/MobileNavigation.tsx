import { navigation } from '@/config/navigation';
import { socialLinks, whatsappLinks } from '@/config/social';

export function MobileNavigation() {
  return (
    <>
      <div className="mobile-overlay" id="mobileOverlay" />
      <nav className="mobile-nav" id="mobileNav">
        <button className="mobile-nav-close" id="mobileNavClose" aria-label="Fechar menu">
          &times;
        </button>
        {navigation.map((item) => (
          <a href={item.href} className="mobile-nav-link" key={item.href}>{item.label}</a>
        ))}
        <a
          href={whatsappLinks.reservation}
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-nav-link"
          style={{ color: 'var(--wine-gold)', marginTop: '1rem', textAlign: 'left' }}
        >
          Faça Sua Reserva
        </a>
        <div className="mobile-socials" style={{ marginTop: 'auto', display: 'flex', gap: '1.5rem', paddingTop: '2rem' }}>
          <a href={socialLinks.headerFacebook} target="_blank" style={{ color: 'var(--wine-cream)' }} aria-label="Siga-nos no Facebook">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
          <a href={socialLinks.headerInstagram} target="_blank" style={{ color: 'var(--wine-cream)' }} aria-label="Siga-nos no Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
          <a href={whatsappLinks.contact} target="_blank" style={{ color: 'var(--wine-cream)' }} aria-label="Fale conosco no WhatsApp">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
              <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
              <path d="M9 10a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
            </svg>
          </a>
        </div>
      </nav>
    </>
  );
}
