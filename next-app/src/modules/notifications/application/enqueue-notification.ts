import type { EnqueueNotificationInput, NotificationRepository } from './ports';

export type EnqueueNotificationDependencies = {
  notifications: NotificationRepository;
};

export function enqueueNotification(
  input: EnqueueNotificationInput,
  dependencies: EnqueueNotificationDependencies,
): Promise<number> {
  if (!input.recipient.trim()) throw new Error('Notification recipient is required');
  return dependencies.notifications.enqueue(input);
}
