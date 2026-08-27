import {
  assertValidAvailabilityQuery,
  calculateAvailability,
  calculateEndTime,
  type AvailabilityQuery,
} from '../domain/availability';
import { assertValidReservationHoldSelection, type ReservationHoldSelection } from '../domain/hold';
import type { AvailabilityRepository, CreatedReservationHold, ReservationRepository } from './ports';

export type CreateReservationHoldInput = AvailabilityQuery & {
  tableIds: number[];
  sessionTokenHash: string;
};

export type CreateReservationHoldDependencies = {
  availability: AvailabilityRepository;
  reservations: ReservationRepository;
};

function optionMatchesTableIds(optionTableIds: number[], selectedTableIds: number[]): boolean {
  return optionTableIds.length === selectedTableIds.length
    && optionTableIds.every((tableId) => selectedTableIds.includes(tableId));
}

export async function createReservationHold(
  input: CreateReservationHoldInput,
  dependencies: CreateReservationHoldDependencies,
): Promise<CreatedReservationHold> {
  const query: AvailabilityQuery = {
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    guestCount: input.guestCount,
    durationMinutes: input.durationMinutes,
  };
  assertValidAvailabilityQuery(query);
  const endTime = calculateEndTime(input.startTime, input.durationMinutes);
  const selection: ReservationHoldSelection = { ...input, endTime };
  assertValidReservationHoldSelection(selection);
  const inventory = await dependencies.availability.findInventory(query, input.sessionTokenHash);
  const availability = calculateAvailability(query, inventory);
  const selectedOption = availability.options.find((option) => optionMatchesTableIds(option.tableIds, input.tableIds));
  if (!selectedOption) throw new Error('Reservation unavailable: selected tables are no longer available');

  return dependencies.reservations.createHold({
    ...selection,
    tableIds: selectedOption.tableIds,
  });
}
