import type { AdminRepository } from './ports';

export type AssignReservationTablesDependencies = { admin: AdminRepository };

export function assignReservationTables(
  reservationId: number,
  tableIds: number[],
  dependencies: AssignReservationTablesDependencies,
): Promise<void> {
  return dependencies.admin.assignReservationTables(reservationId, tableIds);
}
