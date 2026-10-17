import { z } from 'zod';

const phoneDigits = (phone: string) => phone.replace(/\D/g, '');
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const reservationDate = z
  .string({ error: 'Informe a data da reserva.' })
  .regex(datePattern, 'Informe uma data válida.')
  .refine(isCalendarDate, 'Informe uma data válida.');
const reservationTime = z
  .string({ error: 'Informe um horário válido.' })
  .regex(timePattern, 'Informe um horário válido.');

export const specialNeedCodes = [
  'accessibility',
  'reduced_mobility',
  'high_chair',
  'dietary_restriction',
  'food_allergy',
  'other',
  'none',
] as const;

export const newReservationSpecialNeedCodes = [
  'accessibility',
  'reduced_mobility',
  'high_chair',
  'dietary_restriction',
  'food_allergy',
  'other',
] as const;

const guestCount = z
  .number({ error: 'Informe a quantidade de pessoas.' })
  .int('Informe uma quantidade inteira de pessoas.')
  .min(1, 'Selecione pelo menos uma pessoa.')
  .max(20, 'Para grupos acima de 20 pessoas, fale com nossa equipe.');
const reservationDuration = z
  .number({ error: 'Informe a duração da reserva.' })
  .int('A duração deve ser informada em minutos inteiros.')
  .min(15, 'A duração mínima da reserva é de 15 minutos.')
  .max(720, 'A duração máxima da reserva é de 12 horas.');
const tableIds = z
  .array(z.number({ error: 'Selecione uma mesa válida.' }).int('Selecione uma mesa válida.').positive('Selecione uma mesa válida.'), {
    error: 'Selecione uma mesa para continuar.',
  })
  .min(1, 'Selecione uma mesa para continuar.')
  .max(8, 'Selecione no máximo 8 mesas.');
const reservationName = z
  .string({ error: 'Informe seu nome completo.' })
  .trim()
  .min(2, 'Informe seu nome completo.')
  .max(160, 'O nome deve ter no máximo 160 caracteres.');
const reservationPhone = z
  .string({ error: 'Informe um telefone válido.' })
  .trim()
  .refine((value) => {
    const digits = phoneDigits(value);
    return digits.length >= 10 && digits.length <= 13;
  }, 'Informe um telefone válido.');
const reservationEmail = z
  .string({ error: 'Informe um e-mail válido.' })
  .trim()
  .email('Informe um e-mail válido.')
  .max(254, 'O e-mail deve ter no máximo 254 caracteres.');
const reservationNotes = z
  .string({ error: 'Informe observações válidas.' })
  .trim()
  .max(500, 'As observações devem ter no máximo 500 caracteres.');

export const reservationHoldSchema = z.object({
  allocationMode: z.literal('legacy').default('legacy'),
  date: reservationDate,
  time: reservationTime,
  guests: guestCount,
  duration: reservationDuration,
  tableIds,
});

export const automaticReservationHoldSchema = z.object({
  allocationMode: z.literal('automatic'),
  attemptId: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Esta tentativa expirou. Inicie novamente.'),
  expectedRevision: z.number().int().nonnegative(),
  operationKey: z.string().trim().min(16).max(160),
  date: reservationDate,
  time: reservationTime,
  guests: guestCount,
  duration: reservationDuration,
}).strict();

export const reservationHoldRequestSchema = z.union([
  reservationHoldSchema,
  automaticReservationHoldSchema,
]);

export const publicWaitlistSchema = z.object({
  date: reservationDate,
  preferredTime: z.string({ error: 'Informe um horário válido.' }).regex(timePattern, 'Informe um horário válido.').nullable(),
  guests: guestCount,
  name: reservationName,
  phone: reservationPhone,
  email: reservationEmail,
  notes: reservationNotes,
});

export const publicReservationSchema = z.object({
  date: reservationDate,
  time: reservationTime,
  guests: guestCount,
  duration: reservationDuration,
  tableIds,
  name: reservationName,
  phone: reservationPhone,
  email: reservationEmail,
  specialNeeds: z.array(z.enum(newReservationSpecialNeedCodes, { error: 'Selecione uma necessidade válida.' }), { error: 'Selecione as necessidades válidas.' }).max(10, 'Selecione no máximo 10 necessidades.'),
  specialNeedsOther: z.string({ error: 'Descreva a outra necessidade.' }).trim().max(500, 'A descrição deve ter no máximo 500 caracteres.'),
  notes: reservationNotes,
  marketingConsent: z.boolean({ error: 'Informe sua preferência de comunicação.' }),
}).superRefine((input, context) => {
  if (input.specialNeeds.includes('other') && !input.specialNeedsOther) {
    context.addIssue({
      code: 'custom',
      path: ['specialNeedsOther'],
      message: 'Descreva a outra necessidade.',
    });
  }
});

export const authenticatedPublicReservationSchema = z.object({
  flowId: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Esta reserva expirou. Inicie novamente.'),
  allocationMode: z.enum(['legacy', 'automatic']).default('legacy'),
  attemptId: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Esta tentativa expirou. Inicie novamente.').optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
  submissionId: z.string().trim().min(16).max(160).optional(),
  date: reservationDate,
  time: reservationTime,
  guests: guestCount,
  duration: reservationDuration,
  tableIds,
  specialNeeds: z.array(z.enum(newReservationSpecialNeedCodes, { error: 'Selecione uma necessidade válida.' }), { error: 'Selecione as necessidades válidas.' }).max(10, 'Selecione no máximo 10 necessidades.'),
  notes: reservationNotes,
}).strict().superRefine((input, context) => {
  if (input.allocationMode === 'automatic') {
    if (!input.attemptId) context.addIssue({ code: 'custom', path: ['attemptId'], message: 'Esta tentativa expirou. Inicie novamente.' });
    if (input.expectedRevision === undefined) context.addIssue({ code: 'custom', path: ['expectedRevision'], message: 'A seleção ficou desatualizada.' });
    if (!input.submissionId) context.addIssue({ code: 'custom', path: ['submissionId'], message: 'Envie a confirmação novamente.' });
  }
  if (input.specialNeeds.includes('other') && !input.notes) {
    context.addIssue({
      code: 'custom',
      path: ['notes'],
      message: 'Descreva a outra necessidade nas observações.',
    });
  }
});

export type PublicReservationInput = z.infer<typeof publicReservationSchema>;
export type AuthenticatedPublicReservationInput = z.infer<typeof authenticatedPublicReservationSchema>;
export type ReservationHoldInput = z.infer<typeof reservationHoldSchema>;
export type AutomaticReservationHoldInput = z.infer<typeof automaticReservationHoldSchema>;
export type ReservationHoldRequestInput = z.infer<typeof reservationHoldRequestSchema>;
export type PublicWaitlistInput = z.infer<typeof publicWaitlistSchema>;
