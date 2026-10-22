import type { ReactNode } from 'react';
import { formatGuestCount, formatReservationDuration, formatReservationTicketDate } from '@/components/account/reservations-list/reservationCardFormatters';
import styles from './ReservationReceipt.module.css';

export type ReservationReceiptData = {
  publicCode: string;
  reservationDate: string;
  startTime: string;
  durationMinutes: number | null;
  guestCount: number;
};

export type ReservationPaymentEvidence = {
  method: string;
  amount: string;
  paidAt: string;
  demonstrative?: boolean;
};

export function ReservationReceipt({ reservation, paymentEvidence, title = 'Recibo da reserva', className = '', children }: { reservation: ReservationReceiptData; paymentEvidence?: ReservationPaymentEvidence; title?: string; className?: string; children?: ReactNode }) {
  const date = formatReservationTicketDate(reservation.reservationDate);
  return <section className={`${styles.receipt} ${className}`} aria-label={title} data-reservation-receipt>
    <h2>{title}</h2>
    <dl>
      <div><dt>Código</dt><dd>{reservation.publicCode}</dd></div>
      <div><dt>Data</dt><dd>{date.fullLabel}</dd></div>
      <div><dt>Horário</dt><dd>{reservation.startTime}</dd></div>
      <div><dt>Duração</dt><dd>{formatReservationDuration(reservation.durationMinutes)}</dd></div>
      <div><dt>Pessoas</dt><dd>{formatGuestCount(reservation.guestCount)}</dd></div>
    </dl>
    {paymentEvidence ? <p className={styles.notice}>{paymentEvidence.demonstrative ? 'RECIBO DEMONSTRATIVO — SEM VALOR FISCAL E SEM COMPROVAÇÃO DE PAGAMENTO' : 'Pagamento registrado'}<br />Método: {paymentEvidence.method} · Total: {paymentEvidence.amount} · {paymentEvidence.paidAt}</p> : <p className={styles.notice}>SEM VALOR FISCAL E SEM COMPROVAÇÃO DE PAGAMENTO</p>}
    {children}
  </section>;
}
