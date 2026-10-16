import {
  assertValidAvailabilitySearchQuery,
  assertValidAvailabilityQuery,
  calculateAvailability,
  calculateAvailabilitySlots,
  type AvailabilitySearchQuery,
  type AvailabilityQuery,
  type AvailabilityResult,
  type AvailabilitySlotsResult,
  calculateGeneralAvailability,
  type GeneralAvailabilityQuery,
  type GeneralAvailabilityResult,
  type AvailabilityTimeValidator,
} from '../domain/availability';
import type { AvailabilityRepository } from './ports';

export type GetAvailabilityDependencies = {
  availability: AvailabilityRepository;
  sessionTokenHash?: string | null;
  validateTime?: AvailabilityTimeValidator;
};

export async function getAvailability(
  query: AvailabilityQuery,
  dependencies: GetAvailabilityDependencies,
): Promise<AvailabilityResult> {
  assertValidAvailabilityQuery(query);
  const inventory = await dependencies.availability.findInventory(query, dependencies.sessionTokenHash);
  dependencies.validateTime?.({ ...query, serviceWindows: inventory.serviceWindows });
  return calculateAvailability(
    query,
    inventory,
    dependencies.validateTime,
  );
}

export async function getAvailabilitySlots(
  query: AvailabilitySearchQuery,
  dependencies: GetAvailabilityDependencies,
): Promise<AvailabilitySlotsResult> {
  assertValidAvailabilitySearchQuery(query);
  const inventory = await dependencies.availability.findInventory(query, dependencies.sessionTokenHash);
  return calculateAvailabilitySlots(query, inventory, dependencies.validateTime);
}

export async function getGeneralAvailability(
  query: GeneralAvailabilityQuery,
  dependencies: GetAvailabilityDependencies & { timezone: string },
): Promise<GeneralAvailabilityResult> {
  const inventory = await dependencies.availability.findInventory({ ...query, guestCount: 1 }, dependencies.sessionTokenHash);
  return calculateGeneralAvailability(query, inventory, {
    timezone: dependencies.timezone,
    validateTime: dependencies.validateTime,
  });
}
