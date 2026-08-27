import { assertValidReservationWindow } from '@/modules/reservations/domain/reservation-policy';
import type { AdminReservationSchedule, AdminRepository } from './ports';

export type UpdateReservationScheduleDependencies = { admin: AdminRepository };

export async function updateAdminReservationSchedule(
  reservationId: number,
  schedule: AdminReservationSchedule,
  dependencies: UpdateReservationScheduleDependencies,
): Promise<void> {
  assertValidReservationWindow({ ...schedule, guestCount: 1 });
  await dependencies.admin.updateReservationSchedule(reservationId, schedule);
}
