import { createHash, randomBytes } from 'node:crypto';
import { createPublicReservation } from '@/modules/reservations/application/create-public-reservation';
import { createReservationHold } from '@/modules/reservations/application/create-reservation-hold';
import type { CreatedPublicReservation } from '@/modules/reservations/application/create-public-reservation';
import type { CreatedReservationHold } from '@/modules/reservations/application/ports';
import type { PublicReservationInput, ReservationHoldInput } from '@/modules/reservations/schemas/public-reservation-schema';
import { MysqlAvailabilityRepository } from '@/modules/reservations/infrastructure/mysql-availability-repository';
import { MysqlCustomerRepository } from '@/modules/reservations/infrastructure/mysql-customer-repository';
import { MysqlReservationRepository } from '@/modules/reservations/infrastructure/mysql-reservation-repository';

const availabilityRepository = new MysqlAvailabilityRepository();
const customerRepository = new MysqlCustomerRepository();
const reservationRepository = new MysqlReservationRepository();

function createPublicCode(): string {
  return `TW-${randomBytes(8).toString('hex').toUpperCase()}`;
}

function createConfirmationTokenHash(): string {
  return createHash('sha256').update(randomBytes(32)).digest('hex');
}

export function submitPublicReservation(
  input: PublicReservationInput,
  sessionTokenHash: string,
): Promise<CreatedPublicReservation> {
  return createPublicReservation({
    publicCode: createPublicCode(),
    confirmationTokenHash: createConfirmationTokenHash(),
    sessionTokenHash,
    reservationDate: input.date,
    startTime: input.time,
    guestCount: input.guests,
    durationMinutes: input.duration,
    name: input.name,
    phone: input.phone,
    email: input.email,
    tableIds: input.tableIds,
    specialNeeds: input.specialNeeds,
    specialNeedsOther: input.specialNeedsOther,
    notes: input.notes,
    marketingConsent: input.marketingConsent,
  }, {
    availability: availabilityRepository,
    customers: customerRepository,
    reservations: reservationRepository,
  });
}

export function submitReservationHold(
  input: ReservationHoldInput,
  sessionTokenHash: string,
): Promise<CreatedReservationHold> {
  return createReservationHold({
    reservationDate: input.date,
    startTime: input.time,
    guestCount: input.guests,
    durationMinutes: input.duration,
    tableIds: input.tableIds,
    sessionTokenHash,
  }, {
    availability: availabilityRepository,
    reservations: reservationRepository,
  });
}
