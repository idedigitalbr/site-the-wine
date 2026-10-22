import { CircleCheck, Clock3 } from 'lucide-react';
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import { reservationStatusLabels } from './reservationCardFormatters';
import styles from './ReservationsList.module.css';

type StatusVariant = 'confirmed' | 'pending' | 'muted';

export const reservationStatusVariants: Record<ReservationStatus, StatusVariant> = {
  draft: 'pending',
  hold: 'pending',
  payment_pending: 'pending',
  pending: 'pending',
  confirmed: 'confirmed',
  seated: 'confirmed',
  completed: 'confirmed',
  cancelled: 'muted',
  no_show: 'muted',
  expired: 'muted',
};

const variantClasses: Record<StatusVariant, string> = {
  confirmed: styles.statusBadgeConfirmed,
  pending: styles.statusBadgePending,
  muted: styles.statusBadgeMuted,
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const variant = reservationStatusVariants[status];
  const Icon = variant === 'confirmed' ? CircleCheck : Clock3;
  return (
    <span className={`${styles.statusBadge} ${variantClasses[variant]}`}>
      <Icon aria-hidden="true" size={11} strokeWidth={1.6} />
      {reservationStatusLabels[status]}
    </span>
  );
}
