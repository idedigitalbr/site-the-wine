import {
  getAvailability,
  getAvailabilitySlots,
} from '@/modules/reservations/application/get-availability';
import type {
  AvailabilityQuery,
  AvailabilitySearchQuery,
  AvailabilityResult,
  AvailabilitySlotsResult,
} from '@/modules/reservations/domain/availability';
import { MysqlAvailabilityRepository } from '@/modules/reservations/infrastructure/mysql-availability-repository';

const repository = new MysqlAvailabilityRepository();

export function loadAvailability(query: AvailabilityQuery, sessionTokenHash?: string | null): Promise<AvailabilityResult> {
  return getAvailability(query, { availability: repository, sessionTokenHash });
}

export function loadAvailabilitySlots(
  query: AvailabilitySearchQuery,
  sessionTokenHash?: string | null,
): Promise<AvailabilitySlotsResult> {
  return getAvailabilitySlots(query, { availability: repository, sessionTokenHash });
}
