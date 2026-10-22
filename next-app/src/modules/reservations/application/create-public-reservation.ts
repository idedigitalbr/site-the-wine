import {
  assertValidAvailabilityQuery,
  calculateAvailability,
  calculateEndTime,
  type AvailabilityQuery,
} from '../domain/availability';
import { createDraftReservation, startCheckoutReservation } from '../domain/reservation';
import type {
  AvailabilityRepository,
  ConfirmReservationWithHoldInput,
  ReservationRepository,
} from './ports';

export type CreatePublicReservationInput = AvailabilityQuery & {
  publicCode: string;
  confirmationTokenHash: string;
  sessionTokenHash: string;
  customerId: number;
  tableIds: number[];
  specialNeeds: string[];
  notes: string;
};

export type CreatePublicReservationDependencies = {
  availability: AvailabilityRepository;
  reservations: ReservationRepository;
};

export type CreatedPublicReservation = {
  reservationId: number;
  publicCode: string;
  status: 'payment_pending';
};

function optionMatchesTableIds(optionTableIds: number[], selectedTableIds: number[]): boolean {
  return optionTableIds.length === selectedTableIds.length
    && optionTableIds.every((tableId) => selectedTableIds.includes(tableId));
}

export async function createPublicReservation(
  input: CreatePublicReservationInput,
  dependencies: CreatePublicReservationDependencies,
): Promise<CreatedPublicReservation> {
  const query: AvailabilityQuery = {
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    guestCount: input.guestCount,
    durationMinutes: input.durationMinutes,
  };
  assertValidAvailabilityQuery(query);

  const inventory = await dependencies.availability.findInventory(query, input.sessionTokenHash);
  const availability = calculateAvailability(query, inventory);
  const selectedTableIds = input.tableIds.length > 0
    ? input.tableIds
    : availability.options[0]?.tableIds ?? [];
  const selectedOption = availability.options.find((option) => (
    optionMatchesTableIds(option.tableIds, selectedTableIds)
  ));

  if (!selectedOption) {
    throw new Error('Reservation unavailable: selected tables are no longer available');
  }

  const draft = createDraftReservation({
    publicCode: input.publicCode,
    confirmationTokenHash: input.confirmationTokenHash,
    customerId: input.customerId,
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    endTime: calculateEndTime(input.startTime, input.durationMinutes),
    guestCount: input.guestCount,
    notes: input.notes,
  });
  const reservation = startCheckoutReservation(draft);
  const confirmation: ConfirmReservationWithHoldInput = {
    reservation,
    tableIds: selectedOption.tableIds,
    sessionTokenHash: input.sessionTokenHash,
    specialNeeds: input.specialNeeds,
    specialNeedsOther: input.specialNeeds.includes('other') ? input.notes : '',
  };
  const reservationId = await dependencies.reservations.confirmWithHold(confirmation);

  return {
    reservationId,
    publicCode: input.publicCode,
    status: reservation.status,
  };
}
