export const notificationChannels = ['email', 'whatsapp', 'sms'] as const;
export type NotificationChannel = typeof notificationChannels[number];

export const notificationTemplates = [
  'reservation_confirmation',
  'reservation_reminder_24h',
  'reservation_reminder_3h',
  'reservation_cancellation',
  'waitlist_available',
] as const;
export type NotificationTemplate = typeof notificationTemplates[number];

export const notificationStatuses = ['pending', 'processing', 'sent', 'failed', 'cancelled'] as const;
export type NotificationStatus = typeof notificationStatuses[number];

const transitions: Record<NotificationStatus, readonly NotificationStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['sent', 'failed'],
  sent: [],
  failed: ['processing', 'cancelled'],
  cancelled: [],
};

export function isNotificationChannel(value: string): value is NotificationChannel {
  return notificationChannels.includes(value as NotificationChannel);
}

export function isNotificationTemplate(value: string): value is NotificationTemplate {
  return notificationTemplates.includes(value as NotificationTemplate);
}

export function isNotificationStatus(value: string): value is NotificationStatus {
  return notificationStatuses.includes(value as NotificationStatus);
}

export function assertNotificationTransition(from: NotificationStatus, to: NotificationStatus): void {
  if (from !== to && !transitions[from].includes(to)) {
    throw new Error(`Invalid notification transition: ${from} -> ${to}`);
  }
}
