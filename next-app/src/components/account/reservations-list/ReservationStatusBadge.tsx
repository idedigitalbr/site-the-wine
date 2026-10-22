import { CircleAlert, CircleCheck, Clock3 } from 'lucide-react';
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import type { PaymentStatus } from '@/modules/payments/domain/payment';
import { getReservationCardPresentation } from './reservationCardPresentation';
import type { CustomerReservationItem } from '@/types/customer-reservations';
import styles from './ReservationsList.module.css';

type StatusVariant = 'confirmed' | 'pending' | 'muted';

const variantClasses: Record<StatusVariant, string> = {
  confirmed: styles.statusBadgeConfirmed,
  pending: styles.statusBadgePending,
  muted: styles.statusBadgeMuted,
};

export function ReservationStatusBadge({
  status,
  paymentStatus = null,
  historic = false,
}: {
  status: ReservationStatus;
  paymentStatus?: PaymentStatus | null;
  historic?: boolean;
}) {
  const reservation = { status, paymentStatus } as CustomerReservationItem;
  const presentation = getReservationCardPresentation(reservation, historic ? 'historic' : 'default');
  const variant = presentation.statusVariant;
  const Icon = presentation.paymentInProgress ? CircleAlert : variant === 'confirmed' ? CircleCheck : Clock3;
  return (
    <span className={`${styles.statusBadge} ${variantClasses[variant]}`}>
      <span>{presentation.statusLabel}</span>
      <Icon aria-hidden="true" size={11} strokeWidth={presentation.paymentInProgress ? 2.2 : 1.6} />
    </span>
  );
}
