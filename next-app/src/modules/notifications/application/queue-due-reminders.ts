import type {
  NotificationRepository,
  ReservationReminderRepository,
} from './ports';
import { isReminderDue, reminderDefinitions } from '../domain/reminder';

export type QueueDueRemindersDependencies = {
  notifications: NotificationRepository;
  reservations: ReservationReminderRepository;
};

export type QueueDueRemindersResult = {
  scanned: number;
  scheduled: number;
};

export async function queueDueReservationReminders(
  now: Date,
  dependencies: QueueDueRemindersDependencies,
): Promise<QueueDueRemindersResult> {
  const candidates = await dependencies.reservations.listUpcoming();
  let scheduled = 0;
  for (const definition of reminderDefinitions) {
    for (const reservation of candidates) {
      if (!isReminderDue(reservation, definition.leadHours, now)) continue;
      await dependencies.notifications.enqueue({
        channel: 'email',
        template: definition.template,
        recipient: reservation.email,
        dedupeKey: `reservation:${reservation.id}:${definition.template}`,
        payload: {
          publicCode: reservation.publicCode,
          reservationDate: reservation.reservationDate,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          guestCount: reservation.guestCount,
        },
      });
      scheduled += 1;
    }
  }
  return { scanned: candidates.length, scheduled };
}
