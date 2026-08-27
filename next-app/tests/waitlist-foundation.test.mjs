import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('public waitlist uses the existing reservation customer boundary', () => {
  const schema = source('src/modules/reservations/schemas/public-reservation-schema.ts');
  const application = source('src/modules/reservations/application/join-waitlist.ts');
  const repository = source('src/modules/reservations/infrastructure/mysql-waitlist-repository.ts');
  const route = source('src/app/api/reservations/waitlist/route.ts');

  assert.match(schema, /publicWaitlistSchema/);
  assert.match(application, /CustomerRepository/);
  assert.match(application, /WaitlistRepository/);
  assert.match(repository, /INSERT INTO waitlist/);
  assert.match(route, /publicWaitlistSchema/);
  assert.doesNotMatch(route, /MERCADOPAGO|payments/i);
});

test('admin waitlist exposes lifecycle controls without payment dependency', () => {
  const status = source('src/modules/reservations/domain/waitlist.ts');
  const adminRoute = source('src/app/api/admin/waitlist/[id]/route.ts');
  const adminList = source('src/app/api/admin/waitlist/route.ts');
  const adminView = source('src/components/admin/AdminReservationsView.tsx');

  assert.match(status, /waiting.*notified.*converted.*cancelled.*expired/s);
  assert.match(adminRoute, /changeAdminWaitlistStatus/);
  assert.match(adminList, /loadAdminWaitlist/);
  assert.match(adminView, /Lista de espera/);
  assert.match(adminView, /WaitlistStatusControl/);
});
