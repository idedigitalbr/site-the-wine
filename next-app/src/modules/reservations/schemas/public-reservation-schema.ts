import { z } from 'zod';

const phoneDigits = (phone: string) => phone.replace(/\D/g, '');

export const specialNeedCodes = [
  'accessibility',
  'reduced_mobility',
  'high_chair',
  'dietary_restriction',
  'food_allergy',
  'other',
  'none',
] as const;

export const publicReservationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  guests: z.number().int().min(1).max(20),
  duration: z.number().int().min(15).max(720),
  tableIds: z.array(z.number().int().positive()).max(8),
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
