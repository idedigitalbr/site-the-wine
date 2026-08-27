import { createHash, randomBytes } from 'node:crypto';
import { createPublicReservation } from '@/modules/reservations/application/create-public-reservation';
import type { CreatedPublicReservation } from '@/modules/reservations/application/create-public-reservation';
import type { PublicReservationInput } from '@/modules/reservations/schemas/public-reservation-schema';
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
): Promise<CreatedPublicReservation> {
  return createPublicReservation({
    publicCode: createPublicCode(),
    confirmationTokenHash: createConfirmationTokenHash(),
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
