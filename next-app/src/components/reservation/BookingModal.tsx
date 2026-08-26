import { Wine, X } from 'lucide-react';
import { whatsappLinks } from '@/config/social';

export function BookingModal() {
  return (
    <div className="modal-overlay" id="bookingModal">
      <div className="modal-card" style={{ textAlign: 'center', padding: '3.5rem 2.5rem', maxWidth: '460px', width: '90%' }}>
        <button className="modal-close-btn" id="modalCloseBtn" type="button" aria-label="Fechar reserva">
          <X aria-hidden="true" strokeWidth={1.5} />
        </button>

        <div className="modal-icon-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
          <Wine aria-hidden="true" strokeWidth={1.2} style={{ width: '46px', height: '46px', color: 'var(--wine-gold)' }} />
        </div>

        <h3
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '2.2rem',
            fontWeight: 500,
            color: 'var(--wine-gold)',
            marginBottom: '0.6rem',
            letterSpacing: '0.03em',
          }}
        >
          Fazer reserva
        </h3>
        <p
          style={{
            fontFamily: "'Albert Sans', sans-serif",
            fontSize: '1.05rem',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 300,
            marginBottom: '1.5rem',
            lineHeight: 1.6,
            letterSpacing: '0.02em',
          }}
        >
          Fale diretamente com nossa equipe e reserve a sua mesa:
        </p>
        <a
          href={whatsappLinks.reservation}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-gold-outline"
          style={{ display: 'inline-block', padding: '0.9rem 2rem', fontSize: '0.8rem' }}
        >
          Reservar no WhatsApp
        </a>
      </div>
    </div>
  );
}
