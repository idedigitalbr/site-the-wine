import {
  getAvailability,
  getAvailabilitySlots,
  getGeneralAvailability,
} from '@/modules/reservations/application/get-availability';
import { assertReservationTimePolicy } from '@/modules/reservations/domain/reservation-time-policy';
import type {
  AvailabilityQuery,
  AvailabilitySearchQuery,
  AvailabilityResult,
  AvailabilitySlotsResult,
  GeneralAvailabilityQuery,
  GeneralAvailabilityResult,
} from '@/modules/reservations/domain/availability';
import { MysqlAvailabilityRepository } from '@/modules/reservations/infrastructure/mysql-availability-repository';

const repository = new MysqlAvailabilityRepository();

function reservationTimezone(): string {
  return process.env.RESERVATION_ESTABLISHMENT_TIMEZONE?.trim() || 'America/Sao_Paulo';
}

function minimumLeadTimeMinutes(): number {
  const value = Number(process.env.RESERVATION_MIN_LEAD_TIME_MINUTES ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function validateReservationTime(input: Parameters<typeof assertReservationTimePolicy>[0]): void {
  assertReservationTimePolicy(input, {
    timezone: reservationTimezone(),
    minimumLeadTimeMinutes: minimumLeadTimeMinutes(),
  });
}

export function loadAvailability(query: AvailabilityQuery, sessionTokenHash?: string | null): Promise<AvailabilityResult> {
  return getAvailability(query, { availability: repository, sessionTokenHash, validateTime: validateReservationTime });
}

export function loadAvailabilitySlots(
  query: AvailabilitySearchQuery,
  sessionTokenHash?: string | null,
): Promise<AvailabilitySlotsResult> {
  return getAvailabilitySlots(query, { availability: repository, sessionTokenHash, validateTime: validateReservationTime });
}

export function loadGeneralAvailability(
  query: GeneralAvailabilityQuery,
  sessionTokenHash?: string | null,
): Promise<GeneralAvailabilityResult> {
  return getGeneralAvailability(query, {
    availability: repository,
    sessionTokenHash,
    validateTime: validateReservationTime,
    timezone: reservationTimezone(),
  });
}
