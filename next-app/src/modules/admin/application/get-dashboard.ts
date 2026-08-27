import type { AdminDashboard, AdminRepository } from './ports';

export type GetDashboardDependencies = { admin: AdminRepository };

export function getAdminDashboard(
  date: string,
  dependencies: GetDashboardDependencies,
): Promise<AdminDashboard> {
  return dependencies.admin.getDashboard(date);
}
