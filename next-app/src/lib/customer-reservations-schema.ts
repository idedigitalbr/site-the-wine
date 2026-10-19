import { z } from 'zod';
import { reservationStatuses } from '@/modules/reservations/domain/reservation-status';

const safePositiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const safeNonNegativeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const customerReservationItemSchema = z.object({
  id: safePositiveInteger,
  reservationDate: z.iso.date(),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(1).max(1439).nullable(),
  guestCount: safePositiveInteger,
  status: z.enum(reservationStatuses),
  specialNeeds: z.array(z.string().trim().min(1).max(40)),
  notes: z.string().max(500),
});

export const customerReservationsResponseSchema = z.object({
  reservations: z.array(customerReservationItemSchema).max(20),
  nextOffset: safeNonNegativeInteger.nullable(),
});
