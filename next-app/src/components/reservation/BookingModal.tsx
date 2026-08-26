export function BookingModal() {
  return (
    <div className="modal-overlay" id="bookingModal">
      <div className="modal-card" style={{ textAlign: 'center', padding: '3.5rem 2.5rem', maxWidth: '460px', width: '90%' }}>
        <span className="modal-close-btn" id="modalCloseBtn">&times;</span>

        <div className="modal-icon-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: '46px', height: '46px', color: 'var(--wine-gold)' }}
          >
            <path d="M8 2h8M12 15v7M8 22h8M12 15a5 5 0 0 0 5-5V2H7v8a5 5 0 0 0 5 5z" />
          </svg>
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
          href="https://api.whatsapp.com/send?phone=5591984040710&text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20uma%20reserva%20no%20The%20Wine%20Experience."
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
