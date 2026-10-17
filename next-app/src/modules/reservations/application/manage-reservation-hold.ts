import {
  assertValidAvailabilityQuery,
  calculateAvailability,
  calculateEndTime,
  type AvailabilityQuery,
} from '../domain/availability';
import { selectBestAvailableOption } from '../domain/reservation-allocation';
import type { CreatedReservationHold, AvailabilityRepository, ReservationRepository } from './ports';

export type AutomaticReservationHoldInput = AvailabilityQuery & {
  attemptId: string;
  expectedRevision: number;
  operationKey: string;
  sessionTokenHash: string;
  ownerUserId: string;
  ownerCustomerId: number;
};

export type AutomaticReservationHoldDependencies = {
  availability: AvailabilityRepository;
  reservations: ReservationRepository;
};

export async function createAutomaticReservationHold(
  input: AutomaticReservationHoldInput,
  dependencies: AutomaticReservationHoldDependencies,
): Promise<CreatedReservationHold & { attemptId: string; revision: number; allocatedTableCount: number }> {
  assertValidAvailabilityQuery(input);
  if (!input.attemptId || !input.operationKey) throw new Error('Invalid reservation attempt operation');

  const inventory = await dependencies.availability.findInventory(input, input.sessionTokenHash);
  const availability = calculateAvailability(input, inventory);
  const option = selectBestAvailableOption(availability.options, input.guestCount);
  if (!option) throw new Error('Reservation unavailable: no eligible table allocation');

  const hold = await dependencies.reservations.createHoldForAttempt({
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    endTime: calculateEndTime(input.startTime, input.durationMinutes),
    guestCount: input.guestCount,
    durationMinutes: input.durationMinutes,
    tableIds: option.tableIds,
    sessionTokenHash: input.sessionTokenHash,
    attemptId: input.attemptId,
    expectedRevision: input.expectedRevision,
    operationKey: input.operationKey,
    ownerUserId: input.ownerUserId,
    ownerCustomerId: input.ownerCustomerId,
  });

  return {
    ...hold,
    attemptId: input.attemptId,
    revision: input.expectedRevision + 1,
    allocatedTableCount: option.tableIds.length,
  };
}
