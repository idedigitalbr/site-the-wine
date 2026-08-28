import type { AdminRepository } from './ports';

export type RemoveCombinationDependencies = { admin: AdminRepository };

export function removeAdminCombination(
  id: number,
  dependencies: RemoveCombinationDependencies,
): Promise<void> {
  return dependencies.admin.deactivateCombination(id);
}
