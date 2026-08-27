import type { AdminRepository, ConfigurationResource } from './ports';

export type RemoveConfigurationDependencies = { admin: AdminRepository };

export function removeAdminConfiguration(
  resource: ConfigurationResource,
  id: number,
  dependencies: RemoveConfigurationDependencies,
): Promise<void> {
  return dependencies.admin.deactivateConfiguration(resource, id);
}
