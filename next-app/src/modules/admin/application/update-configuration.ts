import type { AdminConfigurationUpdate, AdminRepository } from './ports';

export type UpdateConfigurationDependencies = { admin: AdminRepository };

export function updateAdminConfiguration(
  input: AdminConfigurationUpdate,
  dependencies: UpdateConfigurationDependencies,
): Promise<void> {
  return dependencies.admin.updateConfiguration(input);
}
