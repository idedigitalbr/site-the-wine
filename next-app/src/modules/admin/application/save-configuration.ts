import type {
  AdminConfigurationCommand,
} from '../schemas/admin-schema';
import type { AdminRepository } from './ports';

export type SaveConfigurationDependencies = { admin: AdminRepository };

export async function saveAdminConfiguration(
  input: AdminConfigurationCommand,
  dependencies: SaveConfigurationDependencies,
): Promise<number> {
  switch (input.resource) {
    case 'area':
      return dependencies.admin.createArea(input);
    case 'table_type':
      return dependencies.admin.createTableType(input);
    case 'table':
      return dependencies.admin.createTable(input);
    case 'shift':
      return dependencies.admin.createShift(input);
    case 'business_hour':
      return dependencies.admin.createBusinessHour(input);
  }
}
