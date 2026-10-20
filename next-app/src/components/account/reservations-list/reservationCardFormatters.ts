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

export function formatReservationDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return 'Data não informada';
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatReservationDuration(value: number | null): string {
  if (value === null) return 'Duração não informada';
  return value === 1 ? '1 minuto' : `${value} minutos`;
}

export function formatGuestCount(value: number): string {
  return value === 1 ? '1 pessoa' : `${value} pessoas`;
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
