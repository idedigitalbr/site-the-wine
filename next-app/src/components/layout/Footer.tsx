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
            <svg className="footer-logo-divider__icon" viewBox="0 0 24 24">
              <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2" />
            </svg>
            <span className="footer-logo-divider__line" />
          </div>

          <div className="footer-socials">
            <a href={socialLinks.instagram} target="_blank" className="footer-social-link" aria-label="Siga-nos no Instagram">
              <svg viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a href={socialLinks.facebook} target="_blank" className="footer-social-link" aria-label="Siga-nos no Facebook">
              <svg viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href={socialLinks.tiktok} target="_blank" className="footer-social-link" aria-label="Siga-nos no TikTok">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.22V8.2a6.34 6.34 0 1 0 6.34 6.34V9.28a8.16 8.16 0 0 0 4.77 1.52V7.35a4.85 4.85 0 0 1-1.00-.66z" />
              </svg>
            </a>
            <a href={socialLinks.youtube} target="_blank" className="footer-social-link" aria-label="Assista no YouTube">
              <svg viewBox="0 0 24 24">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.13C5.12 19.56 12 19.56 12 19.56s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
                <polygon points="10 15 15 12 10 9 10 15" style={{ fill: '#d29a3c', stroke: '#d29a3c' }} />
              </svg>
            </a>
          </div>
        </div>

        <div className="footer-col footer-col-contact">
          <h3 className="footer-col__title">Localização</h3>
          <div className="footer-contact-item">
            <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <span>
              Av. Alcindo Cacela, 1848<br />
              Nazaré, Belém – PA<br />
              <span style={{ opacity: 0.65, fontSize: '0.78rem' }}>(Mezanino do +B Supermercados)</span>
            </span>
          </div>
        </div>

        <div className="footer-col footer-col-map">
          <a
            href="https://maps.google.com/?q=The+Wine+Experience+Belem+Alcindo+Cacela+1848"
            target="_blank"
            className="footer-map-link"
            aria-label="Ver localização no Google Maps"
          >
            <img
              src="/assets/Rodape/MAPA-THE-WINE.webp"
              alt="Mapa de localização do The Wine Experience em Nazaré, Belém"
              className="footer-map-img"
            />
          </a>
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
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
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
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
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
            <svg viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 0 0 .611.611l4.458-1.495A11.952 11.952 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.476-.696-6.28-1.886l-.438-.296-3.197 1.072 1.072-3.197-.296-.438A9.958 9.958 0 0 1 2 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
            </svg>
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
            <svg className="footer-bottom__center-icon" viewBox="0 0 24 24">
              <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2" />
            </svg>
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
