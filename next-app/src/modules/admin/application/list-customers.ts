import type { AdminCustomer, AdminRepository } from './ports';

export type ListCustomersDependencies = { admin: AdminRepository };

export function listAdminCustomers(
  search: string | undefined,
  dependencies: ListCustomersDependencies,
): Promise<AdminCustomer[]> {
  return dependencies.admin.listCustomers(search);
}
