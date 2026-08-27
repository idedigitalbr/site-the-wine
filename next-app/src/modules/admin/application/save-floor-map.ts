import type { AdminRepository, CreateBlockedPeriodInput, CreateCombinationInput } from './ports';

export type SaveFloorMapCommand =
  | { resource: 'combination'; code: string; name: string; tableIds: number[] }
  | { resource: 'blocked_period'; scope: 'all' | 'area' | 'table'; areaId: number | null; tableId: number | null; startsAt: string; endsAt: string; reason: string };

export type SaveFloorMapDependencies = { admin: AdminRepository };

export function saveAdminFloorMapCommand(
  input: SaveFloorMapCommand,
  dependencies: SaveFloorMapDependencies,
): Promise<number> {
  if (input.resource === 'combination') {
    const combination: CreateCombinationInput = input;
    return dependencies.admin.createCombination(combination);
  }
  const blockedPeriod: CreateBlockedPeriodInput = input;
  return dependencies.admin.createBlockedPeriod(blockedPeriod);
}
