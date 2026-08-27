import type { NotificationTemplate } from './notification';

export type ReminderCandidate = {
  reservationDate: string;
  startTime: string;
};

export const reminderDefinitions = [
  { template: 'reservation_reminder_24h', leadHours: 24 },
  { template: 'reservation_reminder_3h', leadHours: 3 },
] as const satisfies ReadonlyArray<{ template: NotificationTemplate; leadHours: number }>;

function reservationTimestamp(reservation: ReminderCandidate): number {
  return Date.parse(`${reservation.reservationDate}T${reservation.startTime}:00-03:00`);
}

export function isReminderDue(
  reservation: ReminderCandidate,
  leadHours: number,
  now: Date,
): boolean {
  const reservationAt = reservationTimestamp(reservation);
  const dueAt = reservationAt - leadHours * 60 * 60 * 1000;
  const currentTime = now.getTime();
  return Number.isFinite(reservationAt) && currentTime >= dueAt && currentTime < reservationAt;
}
