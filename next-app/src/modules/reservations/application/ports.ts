import type { ReservationDraft } from '../domain/reservation';
import type {
  AvailabilityInventory,
  AvailabilitySearchQuery,
} from '../domain/availability';

export type ReservationId = number;

export interface ReservationRepository {
  create(input: ReservationDraft): Promise<ReservationId>;
}

export interface CustomerRepository {
  findByNormalizedPhone(normalizedPhone: string): Promise<number | null>;
}

export interface AvailabilityRepository {
  findInventory(query: AvailabilitySearchQuery): Promise<AvailabilityInventory>;
}
