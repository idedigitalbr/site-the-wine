import type { ReservationDraft } from '../domain/reservation';
import type {
  AvailabilityInventory,
  AvailabilitySearchQuery,
} from '../domain/availability';
import type { ReservationHoldSelection } from '../domain/hold';

export type ReservationId = number;

export type CustomerUpsertInput = {
  name: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  marketingConsent: boolean;
};

export type CreatedReservationHold = {
  holdId: number;
  tableIds: number[];
  expiresAt: number;
};

export type ConfirmReservationWithHoldInput = {
  reservation: ReservationDraft;
  tableIds: number[];
  sessionTokenHash: string;
  specialNeeds: string[];
  specialNeedsOther: string;
};

export interface ReservationRepository {
  create(input: ReservationDraft): Promise<ReservationId>;
  assignTables(reservationId: ReservationId, tableIds: number[]): Promise<void>;
  addSpecialNeeds(reservationId: ReservationId, needs: string[], details: string): Promise<void>;
  createHold(input: ReservationHoldSelection): Promise<CreatedReservationHold>;
  confirmWithHold(input: ConfirmReservationWithHoldInput): Promise<ReservationId>;
}

export interface CustomerRepository {
  findByNormalizedPhone(normalizedPhone: string): Promise<number | null>;
  upsert(input: CustomerUpsertInput): Promise<number>;
}

export interface AvailabilityRepository {
  findInventory(query: AvailabilitySearchQuery, sessionTokenHash?: string | null): Promise<AvailabilityInventory>;
}
