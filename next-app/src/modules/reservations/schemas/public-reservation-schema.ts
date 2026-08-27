import { z } from 'zod';

const phoneDigits = (phone: string) => phone.replace(/\D/g, '');
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const reservationDate = z.string().regex(datePattern).refine(isCalendarDate, 'Informe uma data válida.');
const reservationTime = z.string().regex(timePattern);

export const specialNeedCodes = [
  'accessibility',
  'reduced_mobility',
  'high_chair',
  'dietary_restriction',
  'food_allergy',
  'other',
  'none',
] as const;

export const reservationHoldSchema = z.object({
  date: reservationDate,
  time: reservationTime,
  guests: z.number().int().min(1).max(20),
  duration: z.number().int().min(15).max(720),
  tableIds: z.array(z.number().int().positive()).min(1).max(8),
});

export const publicReservationSchema = z.object({
  date: reservationDate,
  time: reservationTime,
  guests: z.number().int().min(1).max(20),
  duration: z.number().int().min(15).max(720),
  tableIds: z.array(z.number().int().positive()).min(1).max(8),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().refine((value) => {
    const digits = phoneDigits(value);
    return digits.length >= 10 && digits.length <= 13;
  }, 'Informe um telefone válido.'),
  email: z.string().trim().email().max(254),
  specialNeeds: z.array(z.enum(specialNeedCodes)).max(10),
  specialNeedsOther: z.string().trim().max(500),
  notes: z.string().trim().max(500),
  marketingConsent: z.boolean(),
}).superRefine((input, context) => {
  if (input.specialNeeds.includes('none') && input.specialNeeds.length > 1) {
    context.addIssue({
      code: 'custom',
      path: ['specialNeeds'],
      message: 'Selecione nenhuma necessidade ou uma necessidade específica.',
    });
  }

  if (input.specialNeeds.includes('other') && !input.specialNeedsOther) {
    context.addIssue({
      code: 'custom',
      path: ['specialNeedsOther'],
      message: 'Descreva a outra necessidade.',
    });
  }
});

export type PublicReservationInput = z.infer<typeof publicReservationSchema>;
export type ReservationHoldInput = z.infer<typeof reservationHoldSchema>;
