import { assertTransition } from '../domain/reservation-status';
import type {
  PortalReservation,
  ReservationPortalRepository,
} from './ports';

export type PortalReservationDependencies = {
  reservations: ReservationPortalRepository;
};

export async function findPortalReservation(
  confirmationTokenHash: string,
  dependencies: PortalReservationDependencies,
): Promise<PortalReservation> {
  if (!confirmationTokenHash.trim()) throw new Error('Reservation portal token is required');

  const reservation = await dependencies.reservations.findByConfirmationTokenHash(confirmationTokenHash);
  if (!reservation) throw new Error('Reservation portal not found');
  return reservation;
}

export async function findPortalReservationByCode(
  publicCode: string,
  dependencies: PortalReservationDependencies,
): Promise<PortalReservation> {
  if (!publicCode.trim()) throw new Error('Reservation public code is required');

  const reservation = await dependencies.reservations.findByPublicCode(publicCode);
  if (!reservation) throw new Error('Reservation portal not found');
  return reservation;
}

export async function cancelPortalReservation(
  confirmationTokenHash: string,
  dependencies: PortalReservationDependencies,
): Promise<PortalReservation> {
  const reservation = await findPortalReservation(confirmationTokenHash, dependencies);
  assertTransition(reservation.status, 'cancelled');
  await dependencies.reservations.cancel(reservation.id);
  return { ...reservation, status: 'cancelled' };
}
