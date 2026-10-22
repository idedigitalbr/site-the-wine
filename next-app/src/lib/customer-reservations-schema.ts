import { z } from 'zod';
import { reservationStatuses } from '@/modules/reservations/domain/reservation-status';
import { paymentStatuses } from '@/modules/payments/domain/payment';

const safePositiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const safeNonNegativeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const customerReservationItemSchema = z.object({
  id: safePositiveInteger,
  publicCode: z.string().trim().min(1).max(80),
  reservationDate: z.iso.date(),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().min(1).max(1439).nullable(),
  guestCount: safePositiveInteger,
  status: z.enum(reservationStatuses),
  paymentStatus: z.enum(paymentStatuses).nullable(),
  timeZone: z.string().trim().min(1).max(100),
  specialNeeds: z.array(z.string().trim().min(1).max(40)),
  notes: z.string().max(500),
});

export const customerReservationsResponseSchema = z.object({
  reservations: z.array(customerReservationItemSchema).max(20),
  nextOffset: safeNonNegativeInteger.nullable(),
});
