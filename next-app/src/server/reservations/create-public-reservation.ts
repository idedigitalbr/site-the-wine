import { createHash, randomBytes } from 'node:crypto';
import { calculateEndTime } from '@/modules/reservations/domain/availability';
import { createPublicReservation } from '@/modules/reservations/application/create-public-reservation';
import { createReservationHold } from '@/modules/reservations/application/create-reservation-hold';
import type { CreatedPublicReservation } from '@/modules/reservations/application/create-public-reservation';
import type { CreatedReservationHold } from '@/modules/reservations/application/ports';
import type { AuthenticatedPublicReservationInput, AutomaticReservationHoldInput, ReservationHoldInput } from '@/modules/reservations/schemas/public-reservation-schema';
import { MysqlAvailabilityRepository } from '@/modules/reservations/infrastructure/mysql-availability-repository';
import { MysqlReservationRepository } from '@/modules/reservations/infrastructure/mysql-reservation-repository';
import { canonicalReservationFingerprint } from '@/modules/reservations/application/confirm-reservation-attempt';
import { configuredReplayKey, decryptReplayPayload, encryptReplayPayload } from '@/server/reservations/replay-crypto';
import { createAutomaticReservationHold } from '@/modules/reservations/application/manage-reservation-hold';
import { queueReservationNotification } from '@/server/notifications/composition';

const availabilityRepository = new MysqlAvailabilityRepository();
const reservationRepository = new MysqlReservationRepository();

type PublicReservationConfirmation = CreatedPublicReservation & { secureToken: string };

// The old reservation_confirmation notification is intentionally not queued here:
// creation now means payment_pending; definitive confirmation belongs to checkout completion.

function createPublicCode(): string {
  return `TW-${randomBytes(8).toString('hex').toUpperCase()}`;
}

function createConfirmationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: createHash('sha256').update(raw).digest('hex') };
}

export function submitPublicReservation(
  input: AuthenticatedPublicReservationInput,
  sessionTokenHash: string,
  customer: { id: number; email: string; userId: string },
): Promise<PublicReservationConfirmation> {
  if (input.allocationMode === 'automatic') {
    if (!input.attemptId || input.expectedRevision === undefined || !input.submissionId) {
      return Promise.reject(new Error('Invalid reservation attempt operation'));
    }
    return submitAutomaticPublicReservation(input as AuthenticatedPublicReservationInput & { allocationMode: 'automatic'; attemptId: string; expectedRevision: number; submissionId: string }, sessionTokenHash, customer);
  }
  const confirmationToken = createConfirmationToken();
  return createPublicReservation({
    publicCode: createPublicCode(),
    confirmationTokenHash: confirmationToken.hash,
    sessionTokenHash,
    reservationDate: input.date,
    startTime: input.time,
    guestCount: input.guests,
    durationMinutes: input.duration,
    customerId: customer.id,
    tableIds: input.tableIds ?? [],
    specialNeeds: input.specialNeeds,
    notes: input.notes,
  }, {
    availability: availabilityRepository,
    reservations: reservationRepository,
  }).then(async (result): Promise<PublicReservationConfirmation> => {
    await queuePendingPaymentNotification(customer.email, result, input);
    return { ...result, secureToken: confirmationToken.raw };
  });
}

async function submitAutomaticPublicReservation(
  input: AuthenticatedPublicReservationInput & { allocationMode: 'automatic'; attemptId: string; expectedRevision: number; submissionId: string },
  sessionTokenHash: string,
  customer: { id: number; email: string; userId: string },
): Promise<PublicReservationConfirmation> {
  const confirmationToken = createConfirmationToken();
  const tableIds = input.tableIds ?? [];
  const publicCode = createPublicCode();
  const fingerprint = canonicalReservationFingerprint({
    date: input.date,
    time: input.time,
    guests: input.guests,
    duration: input.duration,
    tableIds,
    specialNeeds: input.specialNeeds,
    notes: input.notes,
  });
  const replay = encryptReplayPayload({
    status: 'payment_pending',
    secureToken: confirmationToken.raw,
    attemptId: input.attemptId,
    publicCode,
  }, configuredReplayKey());
  const result = await reservationRepository.confirmReservationAttempt({
    attemptId: input.attemptId,
    expectedRevision: input.expectedRevision,
    operationKey: input.submissionId,
    contentFingerprint: fingerprint,
    ownerUserId: customer.userId,
    ownerCustomerId: customer.id,
    reservation: {
      publicCode,
      confirmationTokenHash: createHash('sha256').update(confirmationToken.raw).digest('hex'),
      customerId: customer.id,
      reservationDate: input.date,
      startTime: input.time,
      endTime: calculateEndTime(input.time, input.duration),
      guestCount: input.guests,
      status: 'payment_pending',
      source: 'website',
      notes: input.notes,
    },
    tableIds,
    sessionTokenHash,
    specialNeeds: input.specialNeeds,
    specialNeedsOther: input.specialNeeds.includes('other') ? input.notes : '',
    replay: { ...replay, ciphertext: replay.ciphertext, nonce: replay.nonce, authTag: replay.authTag },
    notificationDedupeKey: `reservation:${input.submissionId}:confirmation`,
  });

  const responsePayload = result.kind === 'replay'
    ? decryptReplayPayload<{ secureToken: string }>(result.replay, configuredReplayKey())
    : { secureToken: confirmationToken.raw };
  if (result.kind === 'created') await queuePendingPaymentNotification(customer.email, result, input);
  return {
    reservationId: result.reservationId,
    publicCode: result.publicCode,
    status: 'payment_pending',
    secureToken: responsePayload.secureToken,
  };
}

async function queuePendingPaymentNotification(email: string, result: { reservationId: number; publicCode: string }, input: { date: string; time: string; duration: number; guests: number }): Promise<void> {
  try {
    await queueReservationNotification({
      email,
      template: 'reservation_payment_pending',
      publicCode: result.publicCode,
      reservationDate: input.date,
      startTime: input.time,
      endTime: calculateEndTime(input.time, input.duration),
      guestCount: input.guests,
      dedupeKey: `reservation:${result.reservationId}:payment-pending`,
    });
  } catch (error) {
    console.error('Reservation payment-pending notification could not be queued', error);
  }
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

export function submitAutomaticReservationHold(
  input: AutomaticReservationHoldInput,
  owner: { userId: string; customerId: number },
  sessionTokenHash: string,
): Promise<CreatedReservationHold & { attemptId: string; revision: number; allocatedTableCount: number }> {
  return createAutomaticReservationHold({
    reservationDate: input.date,
    startTime: input.time,
    guestCount: input.guests,
    durationMinutes: input.duration,
    attemptId: input.attemptId,
    expectedRevision: input.expectedRevision,
    operationKey: input.operationKey,
    sessionTokenHash,
    ownerUserId: owner.userId,
    ownerCustomerId: owner.customerId,
  }, {
    availability: availabilityRepository,
    reservations: reservationRepository,
  }).then((result) => ({ ...result, revision: input.expectedRevision + 1 }));
}
