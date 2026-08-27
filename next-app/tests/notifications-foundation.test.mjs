import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('reservation lifecycle queues notification events without sending externally', () => {
  const migration = source('../database/migrations/005_create_notification_outbox.sql');
  const creation = source('src/server/reservations/create-public-reservation.ts');
  const cancellation = source('src/server/reservations/portal.ts');
  const composition = source('src/server/notifications/composition.ts');

  assert.match(migration, /notification_outbox/);
  assert.match(migration, /payload JSON/);
  assert.match(creation, /reservation_confirmation/);
  assert.match(cancellation, /reservation_cancellation/);
  assert.match(composition, /enqueueNotification/);
  assert.doesNotMatch(composition, /fetch\(|RESEND_API_KEY|MERCADOPAGO/i);
});

test('notification delivery remains a mockable outbox transition', () => {
  const domain = source('src/modules/notifications/domain/notification.ts');
  const application = source('src/modules/notifications/application/process-notification.ts');
  const provider = source('src/modules/notifications/demo/mock-email-provider.ts');
  const adminRoute = source('src/app/api/admin/notifications/[id]/simulate/route.ts');

  assert.match(domain, /pending.*processing.*sent.*failed.*cancelled/s);
  assert.match(application, /markProcessing/);
  assert.match(application, /markSent/);
  assert.match(application, /markFailed/);
  assert.match(provider, /MockEmailProvider/);
  assert.match(adminRoute, /simulateNotificationDelivery/);
});
