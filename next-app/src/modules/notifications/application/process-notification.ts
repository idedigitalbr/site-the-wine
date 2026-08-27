import { assertNotificationTransition } from '../domain/notification';
import type { NotificationRepository, EmailProvider } from './ports';

export type ProcessNotificationDependencies = {
  notifications: NotificationRepository;
  emailProvider: EmailProvider;
};

export async function processNotification(
  id: number,
  dependencies: ProcessNotificationDependencies,
): Promise<void> {
  const notification = await dependencies.notifications.get(id);
  if (!notification) throw new Error('Notification not found');
  assertNotificationTransition(notification.status, 'processing');

  const claimed = await dependencies.notifications.markProcessing(id);
  if (!claimed) throw new Error('Notification is no longer available');

  try {
    if (notification.channel !== 'email') throw new Error('Notification channel is not enabled in demo mode');
    await dependencies.emailProvider.send({
      recipient: notification.recipient,
      template: notification.template,
      payload: notification.payload,
    });
    await dependencies.notifications.markSent(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown notification delivery error';
    await dependencies.notifications.markFailed(id, message);
    throw error;
  }
}
