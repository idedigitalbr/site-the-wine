import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';

const preferenceOrder = [
  'accessibility',
  'dietary_restriction',
  'food_allergy',
  'high_chair',
  'reduced_mobility',
  'other',
] as const;

const preferenceLabels: Record<(typeof preferenceOrder)[number], string> = {
  accessibility: 'Acessibilidade',
  dietary_restriction: 'Restrição alimentar',
  food_allergy: 'Alergia alimentar',
  high_chair: 'Cadeira infantil',
  reduced_mobility: 'Mobilidade reduzida',
  other: 'Outra necessidade',
};

const monthsLong = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const monthsShort = [
  'JAN',
  'FEV',
  'MAR',
  'ABR',
  'MAI',
  'JUN',
  'JUL',
  'AGO',
  'SET',
  'OUT',
  'NOV',
  'DEZ',
] as const;

const weekdaysLong = [
  'DOMINGO',
  'SEGUNDA-FEIRA',
  'TERÇA-FEIRA',
  'QUARTA-FEIRA',
  'QUINTA-FEIRA',
  'SEXTA-FEIRA',
  'SÁBADO',
] as const;

const weekdaysShort = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
] as const;

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  draft: 'Pendente',
  hold: 'Pendente',
  payment_pending: 'Pendente',
  pending: 'Pendente',
  confirmed: 'Confirmada',
  seated: 'Em atendimento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
  expired: 'Expirada',
};

export type ReservationTicketDateParts = {
  isValid: boolean;
  day: string;
  monthYearLine1: string;
  monthYearLine2: string;
  weekdayLong: string;
  monthShort: string;
  year: string;
  weekdayShort: string;
  fullLabel: string;
};

type ParsedCalendarDate = {
  year: number;
  monthIndex: number;
  day: number;
  dayText: string;
  yearText: string;
  weekdayIndex: number;
};

const invalidTicketDateParts: ReservationTicketDateParts = {
  isValid: false,
  day: '--',
  monthYearLine1: 'Data não',
  monthYearLine2: 'informada',
  weekdayLong: 'DATA INDISPONÍVEL',
  monthShort: '---',
  year: '----',
  weekdayShort: '---',
  fullLabel: 'Data não informada',
};

function isSameUtcCalendarDate(date: Date, year: number, monthIndex: number, day: number): boolean {
  if (date.getUTCFullYear() !== year) return false;
  if (date.getUTCMonth() !== monthIndex) return false;
  return date.getUTCDate() === day;
}

function parseIsoCalendarDate(value: string): ParsedCalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, monthIndex, day));
  if (!isSameUtcCalendarDate(date, year, monthIndex, day)) return null;
  return {
    year,
    monthIndex,
    day,
    dayText,
    yearText,
    weekdayIndex: date.getUTCDay(),
  };
}

export function formatReservationDate(value: string): string {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return 'Data não informada';
  return `${parsed.dayText} de ${monthsLong[parsed.monthIndex]} de ${parsed.yearText}`;
}

export function formatReservationTicketDate(value: string): ReservationTicketDateParts {
  const parsed = parseIsoCalendarDate(value);
  if (!parsed) return invalidTicketDateParts;
  const monthName = monthsLong[parsed.monthIndex];
  return {
    isValid: true,
    day: parsed.dayText,
    monthYearLine1: `de ${monthName}`,
    monthYearLine2: `de ${parsed.yearText}`,
    weekdayLong: weekdaysLong[parsed.weekdayIndex],
    monthShort: monthsShort[parsed.monthIndex],
    year: parsed.yearText,
    weekdayShort: weekdaysShort[parsed.weekdayIndex],
    fullLabel: `${parsed.dayText} de ${monthName} de ${parsed.yearText}`,
  };
}

export function formatReservationDuration(value: number | null): string {
  if (value === null) return 'Duração não informada';
  return value === 1 ? '1 minuto' : `${value} minutos`;
}

export function formatCompactDurationParts(value: number | null): { primary: string; unit: string | null } {
  if (value === null) return { primary: 'Não inf.', unit: null };
  return { primary: String(value), unit: 'min' };
}

export function formatGuestCount(value: number): string {
  return value === 1 ? '1 pessoa' : `${value} pessoas`;
}

export function formatCompactGuestParts(value: number): { count: string; unit: string } {
  return {
    count: String(value),
    unit: value === 1 ? 'pessoa' : 'pessoas',
  };
}

export function formatSpecialNeeds(values: string[]): string {
  const useful = [...new Set(values.map((value) => value.trim()).filter((value) => value && value !== 'none'))];
  const known = preferenceOrder.filter((code) => useful.includes(code)).map((code) => preferenceLabels[code]);
  const hasUnknown = useful.some((code) => !preferenceOrder.includes(code as (typeof preferenceOrder)[number]));
  const labels = hasUnknown ? [...known, 'Preferência não identificada'] : known;
  return labels.length > 0 ? labels.join(', ') : 'Nenhuma preferência informada';
}

export function formatReservationNotes(value: string): string {
  return value.trim() || 'Sem observações adicionais';
}

const SIX_HOURS_IN_MS = 6 * 60 * 60 * 1000;

export function isReservationExpired(
  reservationDate: string,
  startTime: string,
  referenceTimeMs: number = Date.now(),
): boolean {
  if (!reservationDate || !startTime) return false;
  const timePart = startTime.length === 5 ? `${startTime}:00` : startTime;
  const reservationStartMs = new Date(`${reservationDate}T${timePart}-03:00`).getTime();
  if (Number.isNaN(reservationStartMs)) return false;
  return referenceTimeMs >= reservationStartMs + SIX_HOURS_IN_MS;
}
