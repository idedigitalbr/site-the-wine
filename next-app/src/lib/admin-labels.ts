import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  draft: 'Rascunho',
  hold: 'Em espera',
  payment_pending: 'Pagamento pendente',
  pending: 'Pendente',
  confirmed: 'Confirmada',
  seated: 'Em atendimento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
  expired: 'Expirada',
};

const reservationSourceLabels: Record<string, string> = {
  website: 'Site',
  admin: 'Painel',
  phone: 'Telefone',
  whatsapp: 'WhatsApp',
  walk_in: 'Presencial',
  instagram: 'Instagram',
  google: 'Google',
};

const reservationEventLabels: Record<string, string> = {
  created: 'Reserva criada',
  walk_in_created: 'Atendimento presencial registrado',
  checked_in: 'Check-in realizado',
  seated: 'Cliente acomodado',
  complete: 'Atendimento concluído',
  completed: 'Atendimento concluído',
  no_show: 'Não compareceu',
  cancelled: 'Reserva cancelada',
  table_changed: 'Mesa alterada',
  schedule_changed: 'Horário alterado',
  status_changed: 'Status atualizado',
};

const actorLabels: Record<string, string> = {
  admin: 'Equipe',
  customer: 'Cliente',
  system: 'Sistema',
};

function humanize(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function reservationStatusLabel(status: string): string {
  return reservationStatusLabels[status as ReservationStatus] ?? humanize(status);
}

export function reservationSourceLabel(source: string): string {
  return reservationSourceLabels[source] ?? humanize(source);
}

export function reservationEventLabel(eventType: string, fromStatus?: string | null, toStatus?: string | null): string {
  const label = reservationEventLabels[eventType] ?? humanize(eventType);
  if (eventType !== 'status_changed') return label;
  return `${label}: ${reservationStatusLabel(fromStatus ?? '—')} → ${reservationStatusLabel(toStatus ?? '—')}`;
}

export function adminActorLabel(actorType: string, actorLabel?: string | null): string {
  return actorLabel?.trim() || actorLabels[actorType] || humanize(actorType);
}

export function formatAdminDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]} às ${match[4]}` : value;
}
