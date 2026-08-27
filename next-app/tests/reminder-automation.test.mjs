import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('reminder automation defines 24h and 3h windows with idempotent outbox keys', () => {
  const migration = source('../database/migrations/006_add_notification_dedupe_key.sql');
  const domain = source('src/modules/notifications/domain/reminder.ts');
  const application = source('src/modules/notifications/application/queue-due-reminders.ts');
  const repository = source('src/modules/notifications/infrastructure/mysql-notification-repository.ts');

  assert.match(migration, /dedupe_key/);
  assert.match(migration, /UNIQUE KEY/);
  assert.match(domain, /reservation_reminder_24h/);
  assert.match(domain, /reservation_reminder_3h/);
  assert.match(domain, /leadHours: 24/);
  assert.match(domain, /leadHours: 3/);
  assert.match(application, /isReminderDue/);
  assert.match(application, /dedupeKey/);
  assert.match(repository, /ON DUPLICATE KEY UPDATE/);
});

test('reminder cycle exposes protected admin and secret-gated local job entrypoints', () => {
  const adminRoute = source('src/app/api/admin/notifications/reminders/route.ts');
  const internalRoute = source('src/app/api/internal/jobs/notifications/reminders/route.ts');
  const script = source('scripts/run-reminders.mjs');

  assert.match(adminRoute, /requireAdminSession/);
  assert.match(adminRoute, /runReservationReminderCycle/);
  assert.match(internalRoute, /NOTIFICATION_JOB_SECRET/);
  assert.match(internalRoute, /timingSafeEqual/);
  assert.match(internalRoute, /x-notification-job-secret/);
  assert.match(script, /jobs\/notifications\/reminders/);
  assert.match(script, /NOTIFICATION_JOB_SECRET/);
  assert.doesNotMatch(internalRoute, /MERCADOPAGO|RESEND/i);
});
