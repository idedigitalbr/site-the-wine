import type {
  NotificationChannel,
  NotificationStatus,
  NotificationTemplate,
} from '../domain/notification';

export type NotificationPayload = Record<string, string | number | null>;

export type EnqueueNotificationInput = {
  channel: NotificationChannel;
  template: NotificationTemplate;
  recipient: string;
  dedupeKey?: string;
  payload: NotificationPayload;
  scheduledAt?: string;
};

export type NotificationOutboxEntry = {
  id: number;
  channel: NotificationChannel;
  template: NotificationTemplate;
  recipient: string;
  dedupeKey: string | null;
  payload: NotificationPayload;
  status: NotificationStatus;
  attempts: number;
  scheduledAt: string;
  sentAt: string | null;
  lastError: string | null;
};

export interface NotificationRepository {
  enqueue(input: EnqueueNotificationInput): Promise<number>;
  list(limit: number): Promise<NotificationOutboxEntry[]>;
  get(id: number): Promise<NotificationOutboxEntry | null>;
  markProcessing(id: number): Promise<boolean>;
  markSent(id: number): Promise<void>;
  markFailed(id: number, error: string): Promise<void>;
}

export type ReminderReservationCandidate = {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  email: string;
};

export interface ReservationReminderRepository {
  listUpcoming(): Promise<ReminderReservationCandidate[]>;
}

export type EmailNotification = {
  recipient: string;
  template: NotificationTemplate;
  payload: NotificationPayload;
};

export interface EmailProvider {
  send(notification: EmailNotification): Promise<void>;
}
