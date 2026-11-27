import type { AdminDashboard, AdminDashboardQuery, AdminRepository } from './ports';

export type GetDashboardDependencies = { admin: AdminRepository };

export function getAdminDashboard(
  query: AdminDashboardQuery,
  dependencies: GetDashboardDependencies,
): Promise<AdminDashboard> {
  return dependencies.admin.getDashboard(query);
}
