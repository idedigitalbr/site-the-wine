import type { AdminFloorMap, AdminRepository } from './ports';

export type GetFloorMapDependencies = { admin: AdminRepository };

export function getAdminFloorMap(
  date: string,
  time: string,
  dependencies: GetFloorMapDependencies,
): Promise<AdminFloorMap> {
  return dependencies.admin.getFloorMap(date, time);
}
