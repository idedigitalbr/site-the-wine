import { enqueueNotification } from '@/modules/notifications/application/enqueue-notification';
import { processNotification } from '@/modules/notifications/application/process-notification';
import { queueDueReservationReminders } from '@/modules/notifications/application/queue-due-reminders';
import type { NotificationOutboxEntry, NotificationPayload } from '@/modules/notifications/application/ports';
import type { NotificationTemplate } from '@/modules/notifications/domain/notification';
import { MockEmailProvider } from '@/modules/notifications/demo/mock-email-provider';
import { MysqlNotificationRepository } from '@/modules/notifications/infrastructure/mysql-notification-repository';
import { MysqlReservationReminderRepository } from '@/modules/notifications/infrastructure/mysql-reservation-reminder-repository';

const notificationRepository = new MysqlNotificationRepository();
const reminderRepository = new MysqlReservationReminderRepository();
const emailProvider = new MockEmailProvider();

type QueueReservationNotificationInput = {
  email: string;
  template: Extract<NotificationTemplate, 'reservation_confirmation' | 'reservation_cancellation'>;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  dedupeKey?: string;
};

export function queueReservationNotification(input: QueueReservationNotificationInput): Promise<number> {
  const payload: NotificationPayload = {
    publicCode: input.publicCode,
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    endTime: input.endTime,
    guestCount: input.guestCount,
  };
  return enqueueNotification({
    channel: 'email',
    template: input.template,
    recipient: input.email,
    dedupeKey: input.dedupeKey,
    payload,
  }, { notifications: notificationRepository });
}

export function listNotifications(limit = 100): Promise<NotificationOutboxEntry[]> {
  return notificationRepository.list(limit);
}

export function simulateNotificationDelivery(id: number): Promise<void> {
  return processNotification(id, { notifications: notificationRepository, emailProvider });
}

export function runReservationReminderCycle(now = new Date()) {
  return queueDueReservationReminders(now, {
    notifications: notificationRepository,
    reservations: reminderRepository,
  });
}
