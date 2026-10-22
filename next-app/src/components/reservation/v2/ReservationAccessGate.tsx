import Link from 'next/link';
import { ArrowRight, UserRound } from 'lucide-react';
import { customerAuthHref } from '@/lib/customer-auth-destination';

export function ReservationAccessGate() {
  return (
    <section className="reservation-access-gate" aria-labelledby="reservation-access-title">
      <div className="reservation-access-gate-icon" aria-hidden="true">
        <UserRound size={48} strokeWidth={1.6} />
      </div>
      <h2 id="reservation-access-title" className="reservation-access-gate-title">Acesse sua conta para continuar</h2>
      <p className="reservation-access-gate-copy">
        Para fazer sua reserva, é necessário estar logado em sua conta. Se você já é cliente, faça seu login. Se ainda não tem uma conta, crie seu cadastro em poucos passos e continue sua reserva.
      </p>
      <Link className="reservation-access-gate-cta" href={customerAuthHref('/reservas')}>
        <span>Entrar ou criar conta</span>
        <ArrowRight aria-hidden="true" size={24} />
      </Link>
    </section>
  );
}
