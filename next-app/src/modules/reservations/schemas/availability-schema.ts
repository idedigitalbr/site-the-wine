import { z } from 'zod';

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  guests: z.coerce.number().int().min(1).max(20),
  duration: z.coerce.number().int().min(15).max(720).default(120),
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
