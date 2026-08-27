import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type {
  EnqueueNotificationInput,
  NotificationOutboxEntry,
  NotificationRepository,
} from '../application/ports';
import type {
  NotificationChannel,
  NotificationStatus,
  NotificationTemplate,
} from '../domain/notification';

type NotificationRow = RowDataPacket & {
  id: number;
  channel: string;
  template: string;
  recipient: string;
  dedupeKey: string | null;
  payload: string | Record<string, string | number | null>;
  status: string;
  attempts: number;
  scheduledAt: string;
  sentAt: string | null;
  lastError: string | null;
};

function mapNotification(row: NotificationRow): NotificationOutboxEntry {
  return {
    id: Number(row.id),
    channel: row.channel as NotificationChannel,
    template: row.template as NotificationTemplate,
    recipient: row.recipient,
    dedupeKey: row.dedupeKey,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) as Record<string, string | number | null> : row.payload,
    status: row.status as NotificationStatus,
    attempts: Number(row.attempts),
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt,
    lastError: row.lastError,
  };
}

export class MysqlNotificationRepository implements NotificationRepository {
  async enqueue(input: EnqueueNotificationInput): Promise<number> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO notification_outbox
        (channel, template, recipient, dedupe_key, payload, scheduled_at)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [input.channel, input.template, input.recipient, input.dedupeKey ?? null, JSON.stringify(input.payload), input.scheduledAt ?? null],
    );
    return result.insertId;
  }

  async list(limit: number): Promise<NotificationOutboxEntry[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const [rows] = await getDatabasePool().query<NotificationRow[]>(
      `SELECT
         id, channel, template, recipient, payload, status, attempts,
         dedupe_key AS dedupeKey,
         DATE_FORMAT(scheduled_at, '%Y-%m-%d %H:%i') AS scheduledAt,
         DATE_FORMAT(sent_at, '%Y-%m-%d %H:%i') AS sentAt,
         last_error AS lastError
       FROM notification_outbox
       ORDER BY created_at DESC, id DESC
       LIMIT ${safeLimit}`,
    );
    return rows.map(mapNotification);
  }

  async get(id: number): Promise<NotificationOutboxEntry | null> {
    const [rows] = await getDatabasePool().execute<NotificationRow[]>(
      `SELECT
         id, channel, template, recipient, payload, status, attempts,
         dedupe_key AS dedupeKey,
         DATE_FORMAT(scheduled_at, '%Y-%m-%d %H:%i') AS scheduledAt,
         DATE_FORMAT(sent_at, '%Y-%m-%d %H:%i') AS sentAt,
         last_error AS lastError
       FROM notification_outbox
       WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] ? mapNotification(rows[0]) : null;
  }

  async markProcessing(id: number): Promise<boolean> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `UPDATE notification_outbox
       SET status = 'processing', attempts = attempts + 1, last_error = NULL
       WHERE id = ? AND status IN ('pending', 'failed')
         AND scheduled_at <= CURRENT_TIMESTAMP`,
      [id],
    );
    return result.affectedRows === 1;
  }

  async markSent(id: number): Promise<void> {
    await getDatabasePool().execute(
      `UPDATE notification_outbox
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'processing'`,
      [id],
    );
  }

  async markFailed(id: number, error: string): Promise<void> {
    await getDatabasePool().execute(
      `UPDATE notification_outbox
       SET status = 'failed', last_error = ?
       WHERE id = ? AND status = 'processing'`,
      [error.slice(0, 500), id],
    );
  }
}
