import { z } from 'zod';
import { reservationOperations } from '@/modules/reservations/domain/reservation-operation';
import { reservationStatuses, type ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import { waitlistStatuses, type WaitlistStatus } from '@/modules/reservations/domain/waitlist';

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

function isAdminRangeValid(from: string, to: string): boolean {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return end >= start && end - start <= 30 * 24 * 60 * 60 * 1000;
}

export const adminDashboardQuerySchema = z.object({
  from: adminDateSchema,
  to: adminDateSchema,
  search: z.string().trim().max(80).optional().default(''),
  time: z.string().regex(timePattern).optional().default(''),
  status: z.union([z.enum(reservationStatuses), z.literal('')]).optional().default(''),
  areaId: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(9),
}).refine(({ from, to }) => isAdminRangeValid(from, to), 'O período deve ser válido e ter no máximo 31 dias.');

export const adminCustomerQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
});

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

export const adminReservationOperationSchema = z.object({
  operation: z.enum(reservationOperations),
});

export const adminReservationTablesSchema = z.object({
  tableIds: z.array(z.number().int().positive()).max(8),
}).superRefine((input, context) => {
  if (new Set(input.tableIds).size !== input.tableIds.length) {
    context.addIssue({ code: 'custom', path: ['tableIds'], message: 'Uma mesa não pode aparecer duas vezes.' });
  }
});

const configurationUpdateId = z.number().int().positive();

export const adminConfigurationUpdateSchema = z.discriminatedUnion('resource', [
  areaCommand.extend({ id: configurationUpdateId }),
  tableTypeCommand.extend({ id: configurationUpdateId }),
  tableCommand.extend({ id: configurationUpdateId }),
  shiftCommand.extend({ id: configurationUpdateId }),
  businessHourCommand.extend({ id: configurationUpdateId }),
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

export const adminConfigurationDeleteSchema = z.object({
  resource: z.enum(['area', 'table_type', 'table', 'shift', 'business_hour']),
  id: configurationUpdateId,
});

export const adminReservationScheduleSchema = z.object({
  reservationDate: adminDateSchema,
  startTime: z.string().regex(timePattern),
  endTime: z.string().regex(timePattern),
}).superRefine((input, context) => {
  if (input.startTime >= input.endTime) {
    context.addIssue({ code: 'custom', path: ['endTime'], message: 'O fim deve ser posterior ao início.' });
  }
});

export const adminWalkInSchema = z.object({
  date: adminDateSchema,
  time: z.string().regex(timePattern),
  duration: z.number().int().min(15).max(720),
  guests: z.number().int().min(1).max(20),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().transform((value) => value.replace(/\D/g, '')).refine((value) => (
    value.length >= 10 && value.length <= 13
  ), 'Informe um telefone válido.'),
  email: z.string().trim().max(254).refine((value) => (
    value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  ), 'Informe um e-mail válido.'),
  notes: z.string().trim().max(500),
  tableIds: z.array(z.number().int().positive()).max(8),
}).superRefine((input, context) => {
  const [hours, minutes] = input.time.split(':').map(Number);
  if ((hours * 60) + minutes + input.duration >= 24 * 60) {
    context.addIssue({ code: 'custom', path: ['duration'], message: 'A duração deve terminar até 00:00.' });
  }
  if (new Set(input.tableIds).size !== input.tableIds.length) {
    context.addIssue({ code: 'custom', path: ['tableIds'], message: 'Uma mesa não pode aparecer duas vezes.' });
  }
});

export const adminWaitlistStatusSchema = z.object({
  status: z.enum(waitlistStatuses),
});

export const floorMapQuerySchema = z.object({
  date: adminDateSchema,
  time: z.string().regex(timePattern),
});

const floorPlanBackgroundUrlSchema = z.string().trim().max(2048).nullable().refine(
  (value) => value === null || value === '' || value.startsWith('/') || value.startsWith('https://'),
  'Informe um caminho local do site ou uma URL HTTPS.',
);

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
  z.object({
    resource: z.literal('background'),
    backgroundUrl: floorPlanBackgroundUrlSchema,
    backgroundOpacity: z.number().min(0.1).max(0.8),
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
export type AdminWaitlistStatus = WaitlistStatus;
