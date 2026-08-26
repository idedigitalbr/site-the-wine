export function ReservationSection() {
  return (
    <section className="cta-reservation" id="reserva">
      <div className="cta-reservation__bg" />
      <div className="cta-reservation__content">
        <h2 className="cta-reservation__headline">
          Sua mesa está
          <span className="cta-reservation__headline-script">esperando</span>
        </h2>
        <p className="cta-reservation__subtitle">
          Garanta seu lugar e viva uma experiência única<br />
          em um ambiente exclusivo.
        </p>
        <a
          href="https://api.whatsapp.com/send?phone=5591984040710&text=Ol%C3%A1%2C%20gostaria%20de%20reservar%20uma%20experi%C3%AAncia%20no%20The%20Wine%20Experience."
          target="_blank"
          rel="noopener noreferrer"
          className="cta-reservation__btn"
          id="btn-reservar-agora"
        >
          RESERVE SUA EXPERIÊNCIA
        </a>
      </div>
    </section>
  );
}
