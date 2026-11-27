'use client';

import { CircleAlert, Printer, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import type { CustomerReservationItem } from '@/types/customer-reservations';
import { getReservationCardPresentation } from './reservationCardPresentation';
import { AddToCalendarButton } from './AddToCalendarButton';
import styles from './ReservationsList.module.css';

export function ReservationCardActions({ reservation, variant, onPrint }: { reservation: CustomerReservationItem; variant: 'default' | 'historic'; onPrint: () => void }) {
  const presentation = getReservationCardPresentation(reservation, variant);
  if (presentation.action === 'none') return null;
  return <div className={styles.cardActions}>
    {presentation.action === 'purchase' ? <Link href={`/reservas?checkoutReservationId=${reservation.id}`} className={styles.cardAction} onClick={(event) => { event.stopPropagation(); }}><ShoppingCart size={15} aria-hidden="true" />Efetuar compra</Link> : <button type="button" className={styles.cardAction} onClick={(event) => { event.stopPropagation(); onPrint(); }}><Printer size={15} aria-hidden="true" />Imprimir recibo</button>}
    <AddToCalendarButton reservation={reservation} />
    {presentation.paymentInProgress && <span className={styles.actionHint}><CircleAlert size={13} aria-hidden="true" />Pagamento aguardando conclusão.</span>}
  </div>;
}
