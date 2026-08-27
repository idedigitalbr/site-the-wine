import { z } from 'zod';
import { reservationSources } from '../domain/reservation';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export const reservationInputSchema = z.object({
  publicCode: z.string().trim().min(6).max(24),
  customerId: z.number().int().positive(),
  experienceId: z.number().int().positive().nullable().optional(),
  reservationDate: z.string().regex(datePattern),
  startTime: z.string().regex(timePattern),
  endTime: z.string().regex(timePattern),
  guestCount: z.number().int().min(1).max(20),
  preferredTableTypeId: z.number().int().positive().nullable().optional(),
  source: z.enum(reservationSources).default('website'),
  notes: z.string().trim().max(500).nullable().optional(),
  internalNotes: z.string().trim().max(1000).nullable().optional(),
  confirmationTokenHash: z.string().length(64).nullable().optional(),
}).superRefine((input, context) => {
  const [startHour, startMinute] = input.startTime.split(':').map(Number);
  const [endHour, endMinute] = input.endTime.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  if (start >= end) {
    context.addIssue({
      code: 'custom',
      path: ['endTime'],
      message: 'endTime must be after startTime',
    });
  }
});
