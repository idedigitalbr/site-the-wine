import { CalendarDays, Clock, Gem, MapPin } from 'lucide-react';
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from '@/components/icons/SocialIcons';
import { socialLinks, whatsappLinks } from '@/config/social';

export function Footer() {
  return (
    <footer className="footer-premium" id="localizacao">
      <div className="footer-premium__inner">
        <div className="footer-col footer-col-logo">
          <img
            src="/assets/Logos/logo_the_wine_branco_dourado_transparente.webp"
            alt="The Wine Experience Logo"
            className="footer-logo-img"
          />

          <div className="footer-logo-divider">
            <span className="footer-logo-divider__line" />
            <Gem className="footer-logo-divider__icon" aria-hidden="true" strokeWidth={1.5} />
            <span className="footer-logo-divider__line" />
          </div>

          <div className="footer-socials">
            <a href={socialLinks.instagram} target="_blank" className="footer-social-link" aria-label="Siga-nos no Instagram">
              <InstagramIcon />
            </a>
            <a href={socialLinks.facebook} target="_blank" className="footer-social-link" aria-label="Siga-nos no Facebook">
              <FacebookIcon />
            </a>
            <a href={socialLinks.tiktok} target="_blank" className="footer-social-link" aria-label="Siga-nos no TikTok">
              <TikTokIcon />
            </a>
            <a href={socialLinks.youtube} target="_blank" className="footer-social-link" aria-label="Assista no YouTube">
              <YouTubeIcon />
            </a>
          </div>
        </div>

        <div className="footer-col footer-col-contact">
          <h3 className="footer-col__title">Localização</h3>
          <div className="footer-contact-item">
            <MapPin aria-hidden="true" strokeWidth={1.5} />
            <span>
              Av. Alcindo Cacela, 1848<br />
              Nazaré, Belém – PA<br />
              <span style={{ opacity: 0.65, fontSize: '0.78rem' }}>(Mezanino do +B Supermercados - Unidade Alcindo Cacela)</span>
            </span>
          </div>
        </div>

        <div className="footer-col footer-col-map">
          <div
            className="footer-map-link"
            role="region"
            aria-label="Mapa da localização do The Wine Experience"
          >
            <iframe
              className="footer-map-iframe"
              src="https://www.google.com/maps?q=The+Wine+Experience+Av.+Alcindo+Cacela+1848+Nazar%C3%A9+Bel%C3%A9m+PA&output=embed"
              title="Mapa da localização do The Wine Experience em Nazaré, Belém"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>

        <div className="footer-col footer-col-hours">
          <h3 className="footer-col__title">Horário de<br />Funcionamento</h3>

          <div className="footer-hours-ornament">
            <span className="footer-hours-ornament__line" />
            <span className="footer-hours-ornament__diamond" />
            <span className="footer-hours-ornament__line" />
          </div>

          <div className="footer-hours-block">
            <div className="footer-hours-day">
              <Clock aria-hidden="true" strokeWidth={1.5} />
              Segunda a Sábado:
            </div>
            <div className="footer-hours-time">12h às 15h / 19h às 23h</div>
          </div>

          <div className="footer-hours-divider">
            <span className="footer-hours-divider__line" />
            <span className="footer-hours-divider__dot" />
            <span className="footer-hours-divider__line" />
          </div>

          <div className="footer-hours-block">
            <div className="footer-hours-day">
              <CalendarDays aria-hidden="true" strokeWidth={1.5} />
              Domingo:
            </div>
            <div className="footer-hours-time">12h às 15h</div>
          </div>
        </div>

        <div className="footer-col footer-col-whatsapp">
          <h3 className="footer-col__title">Fale Conosco</h3>

          <div className="footer-hours-ornament">
            <span className="footer-hours-ornament__line" />
            <span className="footer-hours-ornament__diamond" />
            <span className="footer-hours-ornament__line" />
          </div>

          <div className="footer-whatsapp-icon">
            <WhatsAppIcon />
          </div>

          <a href={whatsappLinks.reservation} target="_blank" className="footer-whatsapp-number">
            (91) 98404-0710
          </a>

          <a href={whatsappLinks.reservation} target="_blank" className="footer-whatsapp-btn">
            Chamar no WhatsApp
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom__inner">
          <span className="footer-bottom__left">© <span id="currentYear">2026</span> The Wine Experience. Todos os direitos reservados.</span>

          <div className="footer-bottom__center">
            <span className="footer-bottom__center-line" />
            <Gem className="footer-bottom__center-icon" aria-hidden="true" strokeWidth={1.5} />
            <span className="footer-bottom__center-line" />
          </div>

          <div className="footer-bottom__right">
            <a href="#">Política de Privacidade</a>
            <span style={{ color: 'rgba(234, 187, 117, 0.5)', fontSize: '0.7rem' }}>·</span>
            <a href="#">Termos de Uso</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
