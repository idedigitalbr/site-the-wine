'use client';

import type { ReactNode } from 'react';
import { CalendarDays, Clock3, Hourglass, SlidersHorizontal, UsersRound } from 'lucide-react';
import { formatCheckoutDate, formatCurrencyCents, formatGuestCount, formatSpecialNeeds } from '@/modules/payments/checkout/checkout-formatters';
import type { CheckoutContext } from '@/modules/payments/checkout/checkout-contract';
import styles from './ReservationCheckout.module.css';

export function TicketFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.ticketFrame} ${className}`}><svg className={styles.ticketDecoration} viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true"><path d="M20 1H380A19 19 0 0 0 399 20V480A19 19 0 0 0 380 499H20A19 19 0 0 0 1 480V20A19 19 0 0 0 20 1Z" vectorEffect="non-scaling-stroke" /></svg><div className={styles.ticketContent}>{children}</div></div>;
}

export function ReservationSummary({ context }: { context: CheckoutContext }) {
  const date = formatCheckoutDate(context.summary.date);
  const rows = [
    [CalendarDays, 'Data', date.date, date.weekday],
    [Clock3, 'Horário', context.summary.time, ''],
    [Hourglass, 'Duração', `${context.summary.durationMinutes} minutos`, ''],
    [UsersRound, 'Pessoas', formatGuestCount(context.summary.guestCount), ''],
    [SlidersHorizontal, 'Preferências', formatSpecialNeeds(context.summary.specialNeeds), ''],
  ] as const;
  return <TicketFrame className={styles.summary}>
    <h2>Resumo da reserva</h2>
    {rows.map(([Icon, label, value, detail]) => <div className={styles.summaryRow} key={label}><Icon size={23} aria-hidden="true" /><span>{label}</span><strong>{value}{detail && <small>{detail}</small>}</strong></div>)}
    <div className={styles.prices}><div><span>Valor por pessoa</span><strong>{formatCurrencyCents(context.quote.unitAmountCents)}</strong></div><div><span>Quantidade de pessoas</span><strong>{context.summary.guestCount}</strong></div></div>
    <div className={styles.total}><span>Total</span><strong>{formatCurrencyCents(context.quote.totalAmountCents)}</strong></div>
  </TicketFrame>;
}
