import { z } from 'zod';
import { authenticatedPublicReservationSchema, specialNeedCodes } from './public-reservation-schema';

export const reservationWriteSchema = authenticatedPublicReservationSchema;

export const historicalReservationPreferencesSchema = z.object({
  specialNeeds: z.array(z.enum(specialNeedCodes)).max(10),
  notes: z.string().max(500),
});
