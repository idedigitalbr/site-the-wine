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
};

export async function getAvailability(
  query: AvailabilityQuery,
  dependencies: GetAvailabilityDependencies,
): Promise<AvailabilityResult> {
  assertValidAvailabilityQuery(query);
  return calculateAvailability(
    query,
    await dependencies.availability.findInventory(query),
  );
}

export async function getAvailabilitySlots(
  query: AvailabilitySearchQuery,
  dependencies: GetAvailabilityDependencies,
): Promise<AvailabilitySlotsResult> {
  assertValidAvailabilitySearchQuery(query);
  const inventory = await dependencies.availability.findInventory(query);
  return calculateAvailabilitySlots(query, inventory);
}
