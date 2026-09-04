import { X } from 'lucide-react';
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from '@/components/icons/SocialIcons';
import { navigation } from '@/config/navigation';
import { socialLinks, whatsappLinks } from '@/config/social';

export function MobileNavigation() {
  return (
    <>
      <div className="mobile-overlay" id="mobileOverlay" />
      <nav className="mobile-nav" id="mobileNav">
        <button className="mobile-nav-close" id="mobileNavClose" aria-label="Fechar menu">
          <X aria-hidden="true" strokeWidth={1.5} />
        </button>
        {navigation.map((item) => (
          <a href={item.href} className="mobile-nav-link" key={item.href}>{item.label}</a>
        ))}
        <a
          href={whatsappLinks.reservation}
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-nav-link"
          style={{
            color: 'var(--wine-gold)',
            marginTop: '1rem',
            textAlign: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(211, 185, 123, 0.45)',
            borderRadius: '8px',
            padding: '0.85rem 1.25rem',
            background: 'rgba(211, 185, 123, 0.1)',
            fontWeight: 600,
            letterSpacing: '0.18em',
          }}
        >
          Faça Sua Reserva
        </a>
        <div
          className="mobile-socials"
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            paddingTop: '2rem',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
          }}
        >
          <a
            href={socialLinks.headerFacebook}
            target="_blank"
            style={{
              color: 'var(--wine-cream)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
            }}
            aria-label="Siga-nos no Facebook"
          >
            <FacebookIcon style={{ width: 22, height: 22 }} />
          </a>
          <a
            href={socialLinks.headerInstagram}
            target="_blank"
            style={{
              color: 'var(--wine-cream)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
            }}
            aria-label="Siga-nos no Instagram"
          >
            <InstagramIcon style={{ width: 22, height: 22 }} />
          </a>
          <a
            href={whatsappLinks.contact}
            target="_blank"
            style={{
              color: 'var(--wine-cream)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
            }}
            aria-label="Fale conosco no WhatsApp"
          >
            <WhatsAppIcon style={{ width: 22, height: 22 }} />
          </a>
        </div>
      </nav>
    </>
  );
}
