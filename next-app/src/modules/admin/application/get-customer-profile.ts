import type { AdminCustomerProfile, AdminRepository } from './ports';

export type GetCustomerProfileDependencies = { admin: AdminRepository };

export function getAdminCustomerProfile(
  id: number,
  dependencies: GetCustomerProfileDependencies,
): Promise<AdminCustomerProfile | null> {
  return dependencies.admin.getCustomerProfile(id);
}
