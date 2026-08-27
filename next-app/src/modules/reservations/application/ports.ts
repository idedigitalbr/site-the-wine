import type { ReservationDraft } from '../domain/reservation';

export type ReservationId = number;

export interface ReservationRepository {
  create(input: ReservationDraft): Promise<ReservationId>;
}

export interface CustomerRepository {
  findByNormalizedPhone(normalizedPhone: string): Promise<number | null>;
}
