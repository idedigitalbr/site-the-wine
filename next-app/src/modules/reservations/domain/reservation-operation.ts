import type { ReservationStatus } from './reservation-status';

export const reservationOperations = ['check_in', 'seat', 'complete', 'no_show'] as const;
export type ReservationOperation = typeof reservationOperations[number];

const operationRules: Record<ReservationOperation, (status: ReservationStatus, checkedInAt: string | null) => boolean> = {
  check_in: (status, checkedInAt) => status === 'confirmed' && checkedInAt === null,
  seat: (status, checkedInAt) => status === 'confirmed' && checkedInAt !== null,
  complete: (status) => status === 'seated',
  no_show: (status) => status === 'confirmed' || status === 'seated',
};

export function assertReservationOperation(
  status: ReservationStatus,
  checkedInAt: string | null,
  operation: ReservationOperation,
): void {
  if (!operationRules[operation](status, checkedInAt)) {
    throw new Error(`Invalid reservation operation: ${operation}`);
  }
}
