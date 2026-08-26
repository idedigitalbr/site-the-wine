import { MobileNavigation } from '@/components/layout/MobileNavigation';
import { navigation } from '@/config/navigation';
import { socialLinks, whatsappLinks } from '@/config/social';

export function Header() {
  return (
    <>
      <header className="header" id="navbar">
        <div className="header-container">
          <a href="#home" className="header-logo" aria-label="Voltar ao topo">
            <img src="/assets/Logos/logo_the_wine_branco_dourado_transparente.webp" alt="The Wine Experience Logo" />
          </a>

          <ul className="nav-menu">
            {navigation.map((item) => (
              <li key={item.href}><a href={item.href} className="nav-link">{item.label}</a></li>
            ))}
          </ul>

          <div className="header-right-side">
            <a
              href={whatsappLinks.reservation}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-header-reserve"
            >
              FAÇA SUA RESERVA
            </a>
            <span className="header-separator">|</span>
            <a href={socialLinks.headerFacebook} target="_blank" className="header-social-link" aria-label="Siga-nos no Facebook">
              <svg className="header-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href={socialLinks.headerInstagram} target="_blank" className="header-social-link" aria-label="Siga-nos no Instagram">
              <svg className="header-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a href={whatsappLinks.contact} target="_blank" className="header-social-link" aria-label="Fale conosco no WhatsApp">
              <svg className="header-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
                <path d="M9 10a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
              </svg>
            </a>
          </div>

          <button className="hamburger" id="hamburgerBtn" aria-label="Abrir Menu">
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <MobileNavigation />
    </>
  );
}
