import type { AdminRepository, AdminReservation } from './ports';

export type ListReservationsDependencies = { admin: AdminRepository };

export function listAdminReservations(
  date: string | undefined,
  dependencies: ListReservationsDependencies,
): Promise<AdminReservation[]> {
  return dependencies.admin.listReservations(date);
}
