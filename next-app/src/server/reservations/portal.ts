import { createHash } from 'node:crypto';
import {
  cancelPortalReservation,
  findPortalReservation,
  findPortalReservationByCode,
} from '@/modules/reservations/application/portal-reservation';
import type { PortalReservation } from '@/modules/reservations/application/ports';
import { MysqlReservationRepository } from '@/modules/reservations/infrastructure/mysql-reservation-repository';
import { queueReservationNotification } from '@/server/notifications/composition';

const reservationRepository = new MysqlReservationRepository();

function hashSecureToken(secureToken: string): string {
  return createHash('sha256').update(secureToken).digest('hex');
}

export function getPublicReservation(secureToken: string): Promise<PortalReservation> {
  return findPortalReservation(hashSecureToken(secureToken), { reservations: reservationRepository });
}

export function getPublicReservationByCode(publicCode: string): Promise<PortalReservation> {
  return findPortalReservationByCode(publicCode, { reservations: reservationRepository });
}

export async function cancelPublicReservation(secureToken: string): Promise<PortalReservation> {
  const tokenHash = hashSecureToken(secureToken);
  const contact = await reservationRepository.findNotificationContactByConfirmationTokenHash(tokenHash);
  const reservation = await cancelPortalReservation(tokenHash, { reservations: reservationRepository });
  if (contact?.email) {
    try {
      await queueReservationNotification({
        email: contact.email,
        template: 'reservation_cancellation',
        publicCode: reservation.publicCode,
        reservationDate: reservation.reservationDate,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        guestCount: reservation.guestCount,
      });
    } catch (error) {
      console.error('Reservation cancellation notification could not be queued', error);
    }
  }
  return reservation;
}
