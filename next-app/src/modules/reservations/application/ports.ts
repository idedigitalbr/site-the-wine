import type { ReservationDraft } from '../domain/reservation';
import type {
  AvailabilityInventory,
  AvailabilitySearchQuery,
} from '../domain/availability';

export type ReservationId = number;

export type CustomerUpsertInput = {
  name: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  marketingConsent: boolean;
};

export interface ReservationRepository {
  create(input: ReservationDraft): Promise<ReservationId>;
  assignTables(reservationId: ReservationId, tableIds: number[]): Promise<void>;
  addSpecialNeeds(reservationId: ReservationId, needs: string[], details: string): Promise<void>;
}

export interface CustomerRepository {
  findByNormalizedPhone(normalizedPhone: string): Promise<number | null>;
  upsert(input: CustomerUpsertInput): Promise<number>;
}

export interface AvailabilityRepository {
  findInventory(query: AvailabilitySearchQuery): Promise<AvailabilityInventory>;
}
