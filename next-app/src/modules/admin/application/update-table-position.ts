import type { AdminRepository } from './ports';

export type UpdateTablePositionDependencies = { admin: AdminRepository };

export function updateAdminTablePosition(
  tableId: number,
  positionX: number,
  positionY: number,
  dependencies: UpdateTablePositionDependencies,
): Promise<void> {
  return dependencies.admin.updateTablePosition({ tableId, positionX, positionY });
}
