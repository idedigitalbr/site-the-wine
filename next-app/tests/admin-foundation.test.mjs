import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const source = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('admin access uses a signed HttpOnly session and environment credentials', () => {
  const auth = source('../src/server/admin/auth.ts');
  assert.match(auth, /createHmac/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /ADMIN_SESSION_SECRET/);
  assert.match(auth, /ADMIN_PASSWORD/);
  assert.match(auth, /path: '\/'/);
});

test('admin MVP exposes protected pages and operational APIs', () => {
  assert.equal(existsSync(new URL('../src/app/admin/(protected)/page.tsx', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/app/admin/(protected)/reservas/page.tsx', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/app/admin/(protected)/salao/page.tsx', import.meta.url)), true);
  assert.equal(existsSync(new URL('../src/app/admin/(protected)/configuracao/page.tsx', import.meta.url)), true);
  assert.match(source('../src/app/admin/(protected)/layout.tsx'), /getAdminSession/);
  assert.match(source('../src/app/api/admin/configuration/route.ts'), /requireAdminSession/);
  assert.match(source('../src/app/api/admin/floor-map/route.ts'), /requireAdminSession/);
  assert.match(source('../src/app/api/admin/floor-map/route.ts'), /ER_DUP_ENTRY/);
  assert.match(source('../src/app/api/admin/floor-map/tables/[id]/route.ts'), /tablePositionSchema/);
  assert.match(source('../src/app/api/admin/reservations/[id]/route.ts'), /changeAdminReservationStatus/);
});

test('admin configuration validates capacities and service windows on the server', () => {
  const schema = source('../src/modules/admin/schemas/admin-schema.ts');
  assert.match(schema, /capacityMin > input\.capacityMax/);
  assert.match(schema, /startsAt >= input\.endsAt/);
  assert.match(schema, /opensAt >= input\.closesAt/);
  assert.match(schema, /isCalendarDate/);
  assert.match(schema, /validateBlockedPeriodScope/);
  assert.match(schema, /z\.discriminatedUnion\('resource'/);
});
