import {
  assertValidAvailabilitySearchQuery,
  assertValidAvailabilityQuery,
  calculateAvailability,
  calculateAvailabilitySlots,
  type AvailabilitySearchQuery,
  type AvailabilityQuery,
  type AvailabilityResult,
  type AvailabilitySlotsResult,
} from '../domain/availability';
import type { AvailabilityRepository } from './ports';

export type GetAvailabilityDependencies = {
  availability: AvailabilityRepository;
  sessionTokenHash?: string | null;
};

export async function getAvailability(
  query: AvailabilityQuery,
  dependencies: GetAvailabilityDependencies,
): Promise<AvailabilityResult> {
  assertValidAvailabilityQuery(query);
  return calculateAvailability(
    query,
    await dependencies.availability.findInventory(query, dependencies.sessionTokenHash),
  );
}

export async function getAvailabilitySlots(
  query: AvailabilitySearchQuery,
  dependencies: GetAvailabilityDependencies,
): Promise<AvailabilitySlotsResult> {
  assertValidAvailabilitySearchQuery(query);
  const inventory = await dependencies.availability.findInventory(query, dependencies.sessionTokenHash);
  return calculateAvailabilitySlots(query, inventory);
}
