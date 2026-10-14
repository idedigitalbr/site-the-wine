import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const appRoot = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, appRoot), 'utf8');

test('reservation channel setting persists with website reservations enabled by default', () => {
  const migrationPath = new URL('../../database/migrations/011_create_system_reservation_settings.sql', import.meta.url);
  assert.equal(existsSync(migrationPath), true);

  const migration = source('../database/migrations/011_create_system_reservation_settings.sql');
  assert.match(migration, /system_reservation_settings/);
  assert.match(migration, /public_reservation_enabled TINYINT\(1\) NOT NULL DEFAULT 1/);
  assert.match(migration, /INSERT INTO system_reservation_settings/);
});

test('reservation WhatsApp setting stores the current number as its default', () => {
  const migrationPath = new URL('../../database/migrations/012_add_reservation_whatsapp_number.sql', import.meta.url);
  assert.equal(existsSync(migrationPath), true);

  const migration = source('../database/migrations/012_add_reservation_whatsapp_number.sql');
  assert.match(migration, /reservation_whatsapp_number VARCHAR\(15\) NOT NULL DEFAULT '5591984040710'/);
});

test('reservation redirect reads the saved mode and selects the page or WhatsApp', () => {
  const route = source('src/app/reservar/route.ts');
  assert.match(route, /getPublicReservationSettings/);
  assert.match(route, /buildReservationWhatsappUrl/);
  assert.match(route, /NextResponse\.redirect/);
  assert.match(route, /reservationWhatsappNumber/);
  assert.match(route, /\/reservas/);
  assert.match(route, /no-store/);
});

test('reservation support links use the configured reservation WhatsApp number', () => {
  const route = source('src/app/whatsapp-reservas/route.ts');
  const builder = source('src/server/system/reservation-whatsapp.ts');
  assert.match(route, /getPublicReservationSettings/);
  assert.match(route, /reservationWhatsappNumber/);
  assert.match(builder, /whatsappLinks\.reservation/);
  assert.match(builder, /searchParams\.set\('phone'/);
  assert.match(source('src/components/reservation/v2/ReservationWizard.tsx'), /href="\/whatsapp-reservas"/);
  assert.match(source('src/app/termos-e-privacidade/page.tsx'), /href="\/whatsapp-reservas"/);
});

test('only authenticated administrators can change the reservation channel', () => {
  const routePath = new URL('../src/app/api/admin/system/reservation-channel/route.ts', import.meta.url);
  assert.equal(existsSync(routePath), true);

  const route = source('src/app/api/admin/system/reservation-channel/route.ts');
  assert.match(route, /requireAdminSession/);
  assert.match(route, /savePublicReservationEnabledSchema/);
  assert.match(route, /setPublicReservationEnabled/);
  assert.match(route, /saveReservationWhatsappNumberSchema/);
  assert.match(route, /setPublicReservationWhatsappNumber/);
});

test('system settings expose an accessible reservation mode switch', () => {
  const view = source('src/components/admin/AdminSystemView.tsx');
  assert.match(view, /Reservas pelo site/);
  assert.match(view, /role="switch"/);
  assert.match(view, /aria-checked=/);
  assert.match(view, /reservation-channel/);
  assert.match(view, /Número do WhatsApp para reservas/);
  assert.match(view, /name="reservationWhatsappNumber"/);
});

test('reservation switch reflects the value confirmed by the save response', () => {
  const view = source('src/components/admin/AdminSystemView.tsx');
  assert.match(view, /onSaved: \(enabled: boolean\) => void/);
  assert.match(view, /publicReservationEnabled: boolean/);
  assert.match(view, /onSaved\(result\.publicReservationEnabled\)/);
  assert.match(view, /publicReservationEnabled: enabled/);
});

test('footer contact links open generic WhatsApp contact instead of reservation text', () => {
  const footer = source('src/components/layout/Footer.tsx');
  assert.match(footer, /href=\{whatsappLinks\.contact\}/);
  assert.doesNotMatch(footer, /href=\{whatsappLinks\.reservation\}/);
});

test('public reservation calls to action open the website reservation flow', () => {
  const publicComponents = [
    'src/components/layout/Header.tsx',
    'src/components/layout/MobileNavigation.tsx',
    'src/components/sections/EventsSection.tsx',
    'src/components/sections/PairingsSection.tsx',
    'src/components/sections/ReservationSection.tsx',
    'src/components/reservation/BookingModal.tsx',
    'src/components/reservation/portal/ReservationPortal.tsx',
  ];

  for (const component of publicComponents) {
    assert.match(source(component), /\/reservas/, `${component} should open the website reservation flow`);
  }
});
