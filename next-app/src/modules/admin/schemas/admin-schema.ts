import { z } from 'zod';
import { reservationStatuses, type ReservationStatus } from '@/modules/reservations/domain/reservation-status';

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const codePattern = /^[a-z0-9][a-z0-9_-]{1,39}$/;
const dateTimePattern = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/;

export const adminLoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

function isCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

export const adminDateSchema = z.string().regex(datePattern).refine(isCalendarDate, 'Informe uma data válida.');

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

export const floorMapQuerySchema = z.object({
  date: adminDateSchema,
  time: z.string().regex(timePattern),
});

function validateCombinationIds(tableIds: number[], context: z.RefinementCtx): void {
  if (new Set(tableIds).size !== tableIds.length) {
    context.addIssue({ code: 'custom', path: ['tableIds'], message: 'Uma mesa não pode aparecer duas vezes.' });
  }
}

type BlockedPeriodInput = { scope: 'all' | 'area' | 'table'; areaId: number | null; tableId: number | null; startsAt: string; endsAt: string };

function validateBlockedPeriodScope(input: BlockedPeriodInput, context: z.RefinementCtx): void {
  if (input.scope === 'all' && (input.areaId !== null || input.tableId !== null)) {
    context.addIssue({ code: 'custom', path: ['scope'], message: 'O bloqueio geral não pode apontar para uma área ou mesa.' });
  }
  if (input.scope === 'area' && input.tableId !== null) {
    context.addIssue({ code: 'custom', path: ['tableId'], message: 'O bloqueio por área não pode apontar para uma mesa.' });
  }
  if (input.scope === 'table' && input.areaId !== null) {
    context.addIssue({ code: 'custom', path: ['areaId'], message: 'O bloqueio por mesa não pode apontar para uma área.' });
  }
}

function validateBlockedPeriod(
  input: BlockedPeriodInput,
  context: z.RefinementCtx,
): void {
  if (input.startsAt >= input.endsAt) {
    context.addIssue({ code: 'custom', path: ['endsAt'], message: 'O fim do bloqueio deve ser posterior ao início.' });
  }
  if (input.scope === 'area' && !input.areaId) {
    context.addIssue({ code: 'custom', path: ['areaId'], message: 'Informe a área do bloqueio.' });
  }
  if (input.scope === 'table' && !input.tableId) {
    context.addIssue({ code: 'custom', path: ['tableId'], message: 'Informe a mesa do bloqueio.' });
  }
  validateBlockedPeriodScope(input, context);
}

export const floorMapCommandSchema = z.discriminatedUnion('resource', [
  z.object({
    resource: z.literal('combination'),
    code: z.string().trim().regex(codePattern),
    name: z.string().trim().min(2).max(120),
    tableIds: z.array(z.number().int().positive()).min(2).max(8),
  }),
  z.object({
    resource: z.literal('blocked_period'),
    scope: z.enum(['all', 'area', 'table']),
    areaId: z.number().int().positive().nullable(),
    tableId: z.number().int().positive().nullable(),
    startsAt: z.string().regex(dateTimePattern).refine((value) => isCalendarDate(value.slice(0, 10)), 'Informe uma data válida.'),
    endsAt: z.string().regex(dateTimePattern).refine((value) => isCalendarDate(value.slice(0, 10)), 'Informe uma data válida.'),
    reason: z.string().trim().min(2).max(255),
  }),
]).superRefine((input, context) => {
  if (input.resource === 'combination') validateCombinationIds(input.tableIds, context);
  if (input.resource === 'blocked_period') validateBlockedPeriod(input, context);
});

export const tablePositionSchema = z.object({
  positionX: z.number().min(0).max(100),
  positionY: z.number().min(0).max(100),
});

export type AdminConfigurationCommand = z.infer<typeof adminConfigurationCommandSchema>;
export type AdminReservationStatusInput = z.infer<typeof adminReservationStatusSchema>;
export type AdminReservationStatus = ReservationStatus;
