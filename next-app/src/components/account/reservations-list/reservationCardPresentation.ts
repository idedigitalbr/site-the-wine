import type { PaymentStatus } from '@/modules/payments/domain/payment';
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import type { CustomerReservationItem } from '@/types/customer-reservations';
import { reservationStatusLabels } from './reservationCardFormatters';

export type ReservationCardStatusVariant = 'confirmed' | 'pending' | 'muted';
export type ReservationCardAction = 'purchase' | 'print' | 'none';

export type ReservationCardPresentation = {
  statusLabel: string;
  statusVariant: ReservationCardStatusVariant;
  paymentInProgress: boolean;
  action: ReservationCardAction;
};

const terminalStatuses = new Set<ReservationStatus>(['cancelled', 'expired', 'no_show', 'completed']);
const unsettledPaymentStatuses = new Set<PaymentStatus>(['pending', 'processing']);

function isMutedReservation(reservation: CustomerReservationItem, variant: 'default' | 'historic'): boolean {
  return variant === 'historic' || reservation.status === 'cancelled' || reservation.status === 'expired' || reservation.status === 'no_show';
}

function isPaymentInProgress(reservation: CustomerReservationItem): boolean {
  const reservationNeedsPayment = reservation.status === 'payment_pending'
    || reservation.status === 'pending'
    || reservation.status === 'draft'
    || reservation.status === 'hold';
  return reservationNeedsPayment || unsettledPaymentStatuses.has(reservation.paymentStatus as PaymentStatus);
}

export function getReservationCardPresentation(
  reservation: CustomerReservationItem,
  variant: 'default' | 'historic' = 'default',
): ReservationCardPresentation {
  if (variant === 'historic' || terminalStatuses.has(reservation.status)) {
    return {
      statusLabel: reservationStatusLabels[reservation.status],
      statusVariant: isMutedReservation(reservation, variant) ? 'muted' : 'confirmed',
      paymentInProgress: false,
      action: 'none',
    };
  }

  const paymentInProgress = isPaymentInProgress(reservation);

  if (paymentInProgress) {
    return {
      statusLabel: 'Em andamento',
      statusVariant: 'pending',
      paymentInProgress: true,
      action: 'purchase',
    };
  }

  return {
    statusLabel: reservationStatusLabels[reservation.status],
    statusVariant: reservation.status === 'confirmed' || reservation.status === 'seated' ? 'confirmed' : 'pending',
    paymentInProgress: false,
    action: 'print',
  };
}
