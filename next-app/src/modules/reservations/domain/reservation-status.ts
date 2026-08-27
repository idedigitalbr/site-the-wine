export const reservationStatuses = [
  'draft',
  'hold',
  'payment_pending',
  'pending',
  'confirmed',
  'seated',
  'completed',
  'cancelled',
  'no_show',
  'expired',
] as const;

export type ReservationStatus = typeof reservationStatuses[number];

const transitions: Record<ReservationStatus, readonly ReservationStatus[]> = {
  draft: ['hold', 'pending', 'confirmed', 'cancelled'],
  hold: ['payment_pending', 'pending', 'confirmed', 'cancelled', 'expired'],
  payment_pending: ['confirmed', 'cancelled', 'expired'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: ['completed', 'no_show'],
  completed: [],
  cancelled: [],
  no_show: [],
  expired: [],
};

export function isReservationStatus(value: string): value is ReservationStatus {
  return reservationStatuses.includes(value as ReservationStatus);
}

export function canTransition(from: ReservationStatus, to: ReservationStatus): boolean {
  return from === to || transitions[from].includes(to);
}

export function assertTransition(from: ReservationStatus, to: ReservationStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid reservation transition: ${from} -> ${to}`);
  }
}
