import { createHash, randomBytes } from 'node:crypto';
import { calculateEndTime } from '@/modules/reservations/domain/availability';
import { createPublicReservation } from '@/modules/reservations/application/create-public-reservation';
import { createReservationHold } from '@/modules/reservations/application/create-reservation-hold';
import type { CreatedPublicReservation } from '@/modules/reservations/application/create-public-reservation';
import type { CreatedReservationHold } from '@/modules/reservations/application/ports';
import type { PublicReservationInput, ReservationHoldInput } from '@/modules/reservations/schemas/public-reservation-schema';
import { MysqlAvailabilityRepository } from '@/modules/reservations/infrastructure/mysql-availability-repository';
import { MysqlCustomerRepository } from '@/modules/reservations/infrastructure/mysql-customer-repository';
import { MysqlReservationRepository } from '@/modules/reservations/infrastructure/mysql-reservation-repository';
import { queueReservationNotification } from '@/server/notifications/composition';

const availabilityRepository = new MysqlAvailabilityRepository();
const customerRepository = new MysqlCustomerRepository();
const reservationRepository = new MysqlReservationRepository();

type PublicReservationConfirmation = CreatedPublicReservation & { secureToken: string };

function createPublicCode(): string {
  return `TW-${randomBytes(8).toString('hex').toUpperCase()}`;
}

function createConfirmationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: createHash('sha256').update(raw).digest('hex') };
}

export function submitPublicReservation(
  input: PublicReservationInput,
  sessionTokenHash: string,
): Promise<PublicReservationConfirmation> {
  const confirmationToken = createConfirmationToken();
  return createPublicReservation({
    publicCode: createPublicCode(),
    confirmationTokenHash: confirmationToken.hash,
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
  }).then(async (result): Promise<PublicReservationConfirmation> => {
    try {
      await queueReservationNotification({
        email: input.email,
        template: 'reservation_confirmation',
        publicCode: result.publicCode,
        reservationDate: input.date,
        startTime: input.time,
        endTime: calculateEndTime(input.time, input.duration),
        guestCount: input.guests,
      });
    } catch (error) {
      console.error('Reservation confirmation notification could not be queued', error);
    }
    return { ...result, secureToken: confirmationToken.raw };
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
