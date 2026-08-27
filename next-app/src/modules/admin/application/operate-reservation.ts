import {
  assertReservationOperation,
  type ReservationOperation,
} from '@/modules/reservations/domain/reservation-operation';
import type { AdminRepository } from './ports';

export type OperateReservationDependencies = { admin: AdminRepository };

export async function operateAdminReservation(
  reservationId: number,
  operation: ReservationOperation,
  dependencies: OperateReservationDependencies,
): Promise<void> {
  const state = await dependencies.admin.getReservationOperationState(reservationId);
  if (!state) throw new Error('Reservation not found');
  assertReservationOperation(state.status, state.checkedInAt, operation);
  await dependencies.admin.applyReservationOperation(reservationId, operation);
}
