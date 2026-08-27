import { createDraftReservation, type CreateReservationInput } from '../domain/reservation';
import type { ReservationRepository } from './ports';

export type CreateReservationDependencies = {
  reservations: ReservationRepository;
};

export async function createReservation(
  input: CreateReservationInput,
  dependencies: CreateReservationDependencies,
): Promise<number> {
  const draft = createDraftReservation(input);
  return dependencies.reservations.create(draft);
}
