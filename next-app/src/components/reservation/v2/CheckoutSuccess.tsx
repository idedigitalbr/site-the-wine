'use client';

import { CalendarDays, Check, Clock3, Copy, Printer, UsersRound, ArrowRight } from 'lucide-react';
import { formatCheckoutDate, formatCurrencyCents, formatGuestCount } from '@/modules/payments/checkout/checkout-formatters';
import type { CheckoutContext, CheckoutPaymentResult } from '@/modules/payments/checkout/checkout-contract';
import styles from './ReservationCheckout.module.css';
import { TicketFrame } from './CheckoutReservationSummary';
import { ReservationReceipt } from '@/components/reservation/receipt/ReservationReceipt';

export function SuccessScreen({ context, payment, onCopy, copied }: { context: CheckoutContext; payment: Extract<CheckoutPaymentResult, { status: 'paid' }>; onCopy: (value: string) => void; copied: boolean }) {
  const date = formatCheckoutDate(context.summary.date);
  return <main className={styles.root}><div className={styles.successInner}>
    <TicketFrame className={styles.successTicket}><span className={styles.successIcon}><Check size={36} /></span><h1>Parabéns!</h1><h2>Sua compra foi concluída com sucesso.</h2><p className={styles.successCopy}>Confira os detalhes da sua reserva abaixo.</p><div className={styles.successCodeBlock}><span className={styles.successLabel}>CÓDIGO DA RESERVA</span><div className={styles.codeLine}><strong>{context.reservation.publicCode}</strong><button type="button" aria-label="Copiar código da reserva" onClick={() => onCopy(context.reservation.publicCode)}><Copy size={19} />{copied ? 'Copiado' : ''}</button></div></div><div className={styles.successMeta}><div><CalendarDays /><span>Data</span><strong>{date.date}<small>{date.weekday}</small></strong></div><div><Clock3 /><span>Horário</span><strong>{context.summary.time}</strong></div><div><UsersRound /><span>Pessoas</span><strong>{formatGuestCount(context.summary.guestCount)}</strong></div></div><p className={styles.demoReceipt}>Confirmação demonstrativa — nenhum pagamento foi realizado.</p><ReservationReceipt className={styles.printOnly} reservation={{ publicCode: context.reservation.publicCode, reservationDate: context.summary.date, startTime: context.summary.time, durationMinutes: context.summary.durationMinutes, guestCount: context.summary.guestCount }} paymentEvidence={{ method: payment.method === 'pix' ? 'Pix' : payment.method === 'credit' ? 'Cartão de crédito' : 'Cartão de débito', amount: formatCurrencyCents(context.quote.totalAmountCents), paidAt: new Date(payment.paidAt).toLocaleString('pt-BR'), demonstrative: true }} /></TicketFrame>
    <div className={styles.successActions}><button type="button" className={styles.outlineAction} onClick={() => window.print()}><Printer size={17} aria-hidden="true" /> <span>Imprimir recibo</span></button><a href="/lista-de-reservas" className={styles.goldAction}>Ver lista de reservas <ArrowRight size={18} aria-hidden="true" /></a></div>
  </div></main>;
}
