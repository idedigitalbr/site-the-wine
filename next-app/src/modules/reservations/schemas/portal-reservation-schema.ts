import { z } from 'zod';

const secureToken = z.string()
  .trim()
  .min(32)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

const publicCode = z.string()
  .trim()
  .min(6)
  .max(24)
  .regex(/^[A-Za-z0-9]+-[A-Za-z0-9]+$/, 'Informe um código de reserva válido.')
  .transform((value) => value.toUpperCase());

export const publicReservationPortalSchema = z.object({
  secureToken,
});

export const publicReservationLookupSchema = z.object({
  publicCode,
});

export type PublicReservationPortalInput = z.infer<typeof publicReservationPortalSchema>;
export type PublicReservationLookupInput = z.infer<typeof publicReservationLookupSchema>;
