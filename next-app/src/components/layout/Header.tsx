import { Camera, Menu, MessageCircle, Share2, X } from 'lucide-react';
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
              <Share2 className="header-social-icon" aria-hidden="true" strokeWidth={1.5} />
            </a>
            <a href={socialLinks.headerInstagram} target="_blank" className="header-social-link" aria-label="Siga-nos no Instagram">
              <Camera className="header-social-icon" aria-hidden="true" strokeWidth={1.5} />
            </a>
            <a href={whatsappLinks.contact} target="_blank" className="header-social-link" aria-label="Fale conosco no WhatsApp">
              <MessageCircle className="header-social-icon" aria-hidden="true" strokeWidth={1.5} />
            </a>
          </div>

          <button className="hamburger" id="hamburgerBtn" aria-label="Abrir Menu" aria-expanded="false" type="button">
            <Menu className="hamburger-menu-icon" aria-hidden="true" strokeWidth={1.5} />
            <X className="hamburger-close-icon" aria-hidden="true" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <MobileNavigation />
    </>
  );
}
