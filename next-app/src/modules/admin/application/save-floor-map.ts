import type { AdminRepository, CreateBlockedPeriodInput, CreateCombinationInput, UpdateFloorPlanSettingsInput } from './ports';

export type SaveFloorMapCommand =
  | { resource: 'combination'; code: string; name: string; tableIds: number[] }
  | { resource: 'blocked_period'; scope: 'all' | 'area' | 'table'; areaId: number | null; tableId: number | null; startsAt: string; endsAt: string; reason: string }
  | { resource: 'background'; backgroundUrl: string | null; backgroundOpacity: number };

export type SaveFloorMapDependencies = { admin: AdminRepository };

export function saveAdminFloorMapCommand(
  input: SaveFloorMapCommand,
  dependencies: SaveFloorMapDependencies,
): Promise<number> {
  if (input.resource === 'background') {
    const settings: UpdateFloorPlanSettingsInput = { url: input.backgroundUrl, opacity: input.backgroundOpacity };
    return dependencies.admin.updateFloorPlanSettings(settings).then(() => 0);
  }
  if (input.resource === 'combination') {
    const combination: CreateCombinationInput = input;
    return dependencies.admin.createCombination(combination);
  }
  const blockedPeriod: CreateBlockedPeriodInput = input;
  return dependencies.admin.createBlockedPeriod(blockedPeriod);
}
