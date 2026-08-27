import { z } from 'zod';
import { reservationStatuses, type ReservationStatus } from '@/modules/reservations/domain/reservation-status';

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const codePattern = /^[a-z0-9][a-z0-9_-]{1,39}$/;

export const adminLoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export const adminDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const capacityFields = {
  capacityMin: z.number().int().min(1).max(20),
  capacityMax: z.number().int().min(1).max(20),
};

const areaCommand = z.object({
  resource: z.literal('area'),
  code: z.string().trim().regex(codePattern),
  name: z.string().trim().min(2).max(120),
});

const tableTypeCommand = z.object({
  resource: z.literal('table_type'),
  code: z.string().trim().regex(codePattern),
  name: z.string().trim().min(2).max(120),
  ...capacityFields,
});

const tableCommand = z.object({
  resource: z.literal('table'),
  code: z.string().trim().regex(codePattern),
  name: z.string().trim().min(2).max(120),
  areaId: z.number().int().positive(),
  tableTypeId: z.number().int().positive(),
  ...capacityFields,
  shape: z.enum(['redonda', 'quadrada', 'retangular', 'balcao']),
  joinable: z.boolean(),
});

const shiftCommand = z.object({
  resource: z.literal('shift'),
  code: z.string().trim().regex(codePattern),
  name: z.string().trim().min(2).max(120),
  startsAt: z.string().regex(timePattern),
  endsAt: z.string().regex(timePattern),
});

const businessHourCommand = z.object({
  resource: z.literal('business_hour'),
  dayOfWeek: z.number().int().min(0).max(6),
  shiftId: z.number().int().positive(),
  opensAt: z.string().regex(timePattern),
  closesAt: z.string().regex(timePattern),
});

export const adminConfigurationCommandSchema = z.discriminatedUnion('resource', [
  areaCommand,
  tableTypeCommand,
  tableCommand,
  shiftCommand,
  businessHourCommand,
]).superRefine((input, context) => {
  if ('capacityMin' in input && input.capacityMin > input.capacityMax) {
    context.addIssue({ code: 'custom', path: ['capacityMax'], message: 'A capacidade máxima deve ser maior ou igual à mínima.' });
  }

  if ('startsAt' in input && input.startsAt >= input.endsAt) {
    context.addIssue({ code: 'custom', path: ['endsAt'], message: 'O fim do turno deve ser posterior ao início.' });
  }

  if ('opensAt' in input && input.opensAt >= input.closesAt) {
    context.addIssue({ code: 'custom', path: ['closesAt'], message: 'O fechamento deve ser posterior à abertura.' });
  }
});

export const adminReservationStatusSchema = z.object({
  status: z.enum(reservationStatuses),
});

export type AdminConfigurationCommand = z.infer<typeof adminConfigurationCommandSchema>;
export type AdminReservationStatusInput = z.infer<typeof adminReservationStatusSchema>;
export type AdminReservationStatus = ReservationStatus;
