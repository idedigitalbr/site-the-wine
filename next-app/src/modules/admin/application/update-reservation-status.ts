import { assertTransition, type ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import type { AdminRepository } from './ports';

export type UpdateReservationStatusDependencies = { admin: AdminRepository };

export async function updateAdminReservationStatus(
  reservationId: number,
  status: ReservationStatus,
  dependencies: UpdateReservationStatusDependencies,
): Promise<void> {
  const currentStatus = await dependencies.admin.getReservationStatus(reservationId);
  if (!currentStatus) throw new Error('Reservation not found');
  assertTransition(currentStatus, status);
  if (currentStatus === status) return;
  await dependencies.admin.updateReservationStatus(reservationId, currentStatus, status);
}
