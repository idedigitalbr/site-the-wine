import type { AdminConfiguration, AdminRepository } from './ports';

export type GetConfigurationDependencies = { admin: AdminRepository };

export function getAdminConfiguration(
  dependencies: GetConfigurationDependencies,
): Promise<AdminConfiguration> {
  return dependencies.admin.getConfiguration();
}
