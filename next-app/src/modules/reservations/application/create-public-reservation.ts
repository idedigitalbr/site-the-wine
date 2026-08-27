import {
  assertValidAvailabilityQuery,
  calculateAvailability,
  calculateEndTime,
  type AvailabilityQuery,
} from '../domain/availability';
import { confirmDraftReservation, createDraftReservation } from '../domain/reservation';
import { normalizePhone } from '../../customers/domain/customer';
import type {
  AvailabilityRepository,
  ConfirmReservationWithHoldInput,
  CustomerRepository,
  ReservationRepository,
} from './ports';

export type CreatePublicReservationInput = AvailabilityQuery & {
  publicCode: string;
  confirmationTokenHash: string;
  sessionTokenHash: string;
  name: string;
  phone: string;
  email: string;
  tableIds: number[];
  specialNeeds: string[];
  specialNeedsOther: string;
  notes: string;
  marketingConsent: boolean;
};

export type CreatePublicReservationDependencies = {
  availability: AvailabilityRepository;
  customers: CustomerRepository;
  reservations: ReservationRepository;
};

export type CreatedPublicReservation = {
  reservationId: number;
  publicCode: string;
  status: 'confirmed';
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

  const customerId = await dependencies.customers.upsert({
    name: input.name,
    phone: input.phone,
    normalizedPhone: normalizePhone(input.phone),
    email: input.email,
    marketingConsent: input.marketingConsent,
  });
  const draft = createDraftReservation({
    publicCode: input.publicCode,
    confirmationTokenHash: input.confirmationTokenHash,
    customerId,
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    endTime: calculateEndTime(input.startTime, input.durationMinutes),
    guestCount: input.guestCount,
    notes: input.notes,
  });
  const reservation = confirmDraftReservation(draft);
  const confirmation: ConfirmReservationWithHoldInput = {
    reservation,
    tableIds: selectedOption.tableIds,
    sessionTokenHash: input.sessionTokenHash,
    specialNeeds: input.specialNeeds,
    specialNeedsOther: input.specialNeedsOther,
  };
  const reservationId = await dependencies.reservations.confirmWithHold(confirmation);

  return {
    reservationId,
    publicCode: input.publicCode,
    status: reservation.status,
  };
}
