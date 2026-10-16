import { z } from 'zod';

const sharedFields = {
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration: z.coerce.number().int().min(15).max(720).default(120),
};

const legacyAvailabilityQuerySchema = z.object({
  ...sharedFields,
  mode: z.literal('legacy').optional(),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  guests: z.coerce.number().int().min(1).max(20),
});

const generalAvailabilityQuerySchema = z.object({
  ...sharedFields,
  mode: z.literal('general'),
  time: z.never().optional(),
  guests: z.never().optional(),
});

export const availabilityQuerySchema = z.union([
  generalAvailabilityQuerySchema,
  legacyAvailabilityQuerySchema,
]);

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
