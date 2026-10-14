import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

async function loadTypeScriptModule(relativePath) {
  const compiled = ts.transpileModule(source(relativePath), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: relativePath,
  });
  const encoded = Buffer.from(compiled.outputText).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

test('reservation operation domain enforces the reception sequence', async () => {
  const { assertReservationOperation } = await loadTypeScriptModule('src/modules/reservations/domain/reservation-operation.ts');

  assert.doesNotThrow(() => assertReservationOperation('confirmed', null, 'check_in'));
  assert.throws(() => assertReservationOperation('confirmed', '2026-08-27 18:00', 'check_in'), /Invalid reservation operation/);
  assert.throws(() => assertReservationOperation('confirmed', null, 'seat'), /Invalid reservation operation/);
  assert.doesNotThrow(() => assertReservationOperation('confirmed', '2026-08-27 18:00', 'seat'));
  assert.doesNotThrow(() => assertReservationOperation('seated', '2026-08-27 18:00', 'complete'));
  assert.doesNotThrow(() => assertReservationOperation('confirmed', null, 'no_show'));
});

test('admin presentation translates reservation sources, events and timestamps', async () => {
  const { adminActorLabel, formatAdminDateTime, reservationEventLabel, reservationSourceLabel, reservationStatusLabel } = await loadTypeScriptModule('src/lib/admin-labels.ts');

  assert.equal(reservationSourceLabel('walk_in'), 'Presencial');
  assert.equal(reservationEventLabel('walk_in_created'), 'Atendimento presencial registrado');
  assert.equal(reservationEventLabel('table_changed'), 'Mesa alterada');
  assert.equal(reservationEventLabel('complete'), 'Atendimento concluído');
  assert.equal(reservationEventLabel('status_changed', 'no_show', 'completed'), 'Status atualizado: Não compareceu → Concluída');
  assert.equal(reservationStatusLabel('no_show'), 'Não compareceu');
  assert.equal(adminActorLabel('customer', null), 'Cliente');
  assert.equal(formatAdminDateTime('2026-08-27 12:25'), '27/08/2026 às 12:25');
});

test('phase seven exposes walk-in, timeline and operational persistence contracts', () => {
  const migration = source('../database/migrations/007_add_reservation_operations.sql');
  const adminRepository = source('src/modules/admin/infrastructure/mysql-admin-repository.ts');
  const composition = source('src/server/admin/composition.ts');
  const reservationsRoute = source('src/app/api/admin/reservations/[id]/route.ts');
  const walkInRoute = source('src/app/api/admin/reservations/walk-in/route.ts');
  const timelineRoute = source('src/app/api/admin/reservations/[id]/timeline/route.ts');

  assert.match(migration, /checked_in_at/);
  assert.match(migration, /reservation_events/);
  assert.match(migration, /reservation_events_timeline_idx/);
  assert.match(adminRepository, /applyReservationOperation/);
  assert.match(adminRepository, /FOR UPDATE/);
  assert.match(adminRepository, /walk_in_created/);
  assert.match(composition, /createAdminWalkIn/);
  assert.match(reservationsRoute, /adminReservationOperationSchema/);
  assert.match(walkInRoute, /requireAdminSession/);
  assert.match(timelineRoute, /loadReservationTimeline/);
});

test('phase seven supports transactional table assignment and schedule changes', () => {
  const adminRepository = source('src/modules/admin/infrastructure/mysql-admin-repository.ts');
  const assignmentRoute = source('src/app/api/admin/reservations/[id]/assignment/route.ts');
  const scheduleRoute = source('src/app/api/admin/reservations/[id]/schedule/route.ts');
  const reservationsView = source('src/components/admin/AdminReservationsView.tsx');
  const assignmentComponent = source('src/components/admin/AdminReservationAssignment.tsx');
  const scheduleComponent = source('src/components/admin/AdminReservationSchedule.tsx');

  assert.match(adminRepository, /validateAssignmentCapacity/);
  assert.match(adminRepository, /validateAssignmentConflicts/);
  assert.match(adminRepository, /validateAssignmentBlocks/);
  assert.match(adminRepository, /capacity_min AS capacityMin/);
  assert.match(adminRepository, /Reservation tables capacity minimum not met/);
  assert.match(adminRepository, /table_combination_items/);
  assert.match(adminRepository, /reservation_holds/);
  assert.match(adminRepository, /table_changed/);
  assert.match(adminRepository, /schedule_changed/);
  assert.match(adminRepository, /Reservation tables locked/);
  assert.match(assignmentRoute, /adminReservationTablesSchema/);
  assert.match(assignmentRoute, /tables_unavailable/);
  assert.match(scheduleRoute, /adminReservationScheduleSchema/);
  assert.match(scheduleRoute, /schedule_unavailable/);
  assert.match(reservationsView, /AdminReservationAssignment/);
  assert.match(reservationsView, /AdminReservationSchedule/);
  assert.match(assignmentComponent, /\/assignment/);
  assert.match(scheduleComponent, /\/schedule/);
});

test('phase eight exposes protected operational analytics without real payment revenue', () => {
  const ports = source('src/modules/admin/application/ports.ts');
  const adminRepository = source('src/modules/admin/infrastructure/mysql-admin-repository.ts');
  const analyticsUseCase = source('src/modules/admin/application/get-analytics.ts');
  const composition = source('src/server/admin/composition.ts');
  const route = source('src/app/api/admin/analytics/route.ts');
  const page = source('src/app/admin/(protected)/page.tsx');
  const view = source('src/components/admin/AdminAnalyticsView.tsx');

  assert.match(ports, /export type AdminAnalytics/);
  assert.match(ports, /revenueMode: 'mock'/);
  assert.match(adminRepository, /async getAnalytics/);
  assert.match(adminRepository, /assignedCapacity/);
  assert.match(analyticsUseCase, /getAdminAnalytics/);
  assert.match(composition, /loadAdminAnalytics/);
  assert.match(route, /requireAdminSession/);
  assert.match(route, /adminAnalyticsQuerySchema/);
  assert.match(page, /loadAdminAnalytics/);
  assert.match(view, /Ocupação atribuída/);
  assert.match(view, /nenhum valor real/);
});

test('phase nine exposes a protected customer directory with operational history', () => {
  const ports = source('src/modules/admin/application/ports.ts');
  const adminRepository = source('src/modules/admin/infrastructure/mysql-admin-repository.ts');
  const listCustomers = source('src/modules/admin/application/list-customers.ts');
  const profileUseCase = source('src/modules/admin/application/get-customer-profile.ts');
  const composition = source('src/server/admin/composition.ts');
  const customersRoute = source('src/app/api/admin/customers/route.ts');
  const profileRoute = source('src/app/api/admin/customers/[id]/route.ts');
  const customersPage = source('src/app/admin/(protected)/clientes/page.tsx');
  const profilePage = source('src/app/admin/(protected)/clientes/[id]/page.tsx');
  const customersView = source('src/components/admin/AdminCustomersView.tsx');
  const profileView = source('src/components/admin/AdminCustomerProfileView.tsx');
  const shell = source('src/components/admin/AdminShell.tsx');

  assert.match(ports, /export type AdminCustomerProfile/);
  assert.match(ports, /export type AdminCustomerActivity/);
  assert.match(adminRepository, /customerSummarySelect/);
  assert.match(adminRepository, /FROM reservation_events/);
  assert.match(adminRepository, /async getCustomerProfile/);
  assert.match(listCustomers, /listAdminCustomers/);
  assert.match(profileUseCase, /getAdminCustomerProfile/);
  assert.match(composition, /loadAdminCustomerProfile/);
  assert.match(customersRoute, /requireAdminSession/);
  assert.match(customersRoute, /adminCustomerQuerySchema/);
  assert.match(profileRoute, /customer_not_found/);
  assert.match(customersPage, /AdminCustomersView/);
  assert.match(profilePage, /AdminCustomerProfileView/);
  assert.match(customersView, /Buscar cliente/);
  assert.match(profileView, /Auditoria operacional/);
  assert.match(shell, /\/admin\/clientes/);
});

test('public reservation entry points use the configured reservation channel', () => {
  const header = source('src/components/layout/Header.tsx');
  const mobileNavigation = source('src/components/layout/MobileNavigation.tsx');
  const events = source('src/components/sections/EventsSection.tsx');
  const pairings = source('src/components/sections/PairingsSection.tsx');
  const reservationSection = source('src/components/sections/ReservationSection.tsx');
  const bookingModal = source('src/components/reservation/BookingModal.tsx');
  const reservationPortal = source('src/components/reservation/portal/ReservationPortal.tsx');

  for (const component of [header, mobileNavigation, events, pairings, reservationSection, bookingModal, reservationPortal]) {
    assert.match(component, /href="\/reservar"/);
  }

  assert.doesNotMatch(header, /href=\{whatsappLinks\.reservation\}/);
  assert.doesNotMatch(mobileNavigation, /href=\{whatsappLinks\.reservation\}/);
  assert.doesNotMatch(events, /href=\{whatsappLinks\.(?:dinner|corporate)\}/);
  assert.equal((events.match(/href="\/reservar"/g) ?? []).length, 2);
  assert.doesNotMatch(pairings, /href=\{whatsappLinks\.reservation\}/);
  assert.doesNotMatch(reservationSection, /href=\{whatsappLinks\.experience\}/);
  assert.match(bookingModal, /Fazer reserva/);
  assert.doesNotMatch(bookingModal, /Reservar no WhatsApp/);
  assert.match(reservationPortal, /Falar com a equipe/);
});

test('reservation page uses a route-specific canonical and app-managed stylesheet import', () => {
  const page = source('src/app/reservas/page.tsx');

  assert.match(page, /alternates:\s*{\s*canonical:\s*'\/reservas'/);
  assert.match(page, /import\s+['"]\.\.\/\.\.\/\.\.\/public\/style\.css['"]/);
  assert.doesNotMatch(page, /<link\b[^>]*rel=["']stylesheet["']/);
});

test('public reservation forms expose sanitized contact and field-level validation', () => {
  const phone = source('src/lib/phone.ts');
  const wizard = source('src/components/reservation/v2/ReservationWizard.tsx');
  const waitlist = source('src/components/reservation/v2/WaitlistForm.tsx');
  const styles = source('src/app/globals.css');

  assert.match(phone, /replace\(\/\\D\/g, ''\)/);
  assert.match(wizard, /formatPhoneInput\(event\.target\.value\)/);
  assert.match(wizard, /autoComplete="tel"/);
  assert.match(waitlist, /publicWaitlistSchema\.safeParse/);
  assert.match(waitlist, /waitlist-phone-error/);
  assert.match(waitlist, /Corrija os campos destacados/);
  assert.match(styles, /::-webkit-calendar-picker-indicator/);
});

test('public reservation validation messages are localized', () => {
  const schema = source('src/modules/reservations/schemas/public-reservation-schema.ts');

  assert.match(schema, /Informe seu nome completo\./);
  assert.match(schema, /Informe um e-mail válido\./);
  assert.match(schema, /Selecione pelo menos uma pessoa\./);
  assert.match(schema, /Informe um telefone válido\./);
  assert.doesNotMatch(schema, /\.min\(2\)\b/);
  assert.doesNotMatch(schema, /\.email\(\)\b/);
});

test('local restaurant seed is restricted to the Laragon thewine database', () => {
  const seed = source('scripts/seed-local-restaurant.mjs');
  const packageJson = source('package.json');

  assert.match(seed, /DATABASE_HOST precisa apontar para o MySQL local/);
  assert.match(seed, /DATABASE_NAME precisa ser exatamente thewine/);
  assert.match(seed, /dining_areas/);
  assert.match(seed, /restaurant_tables/);
  assert.match(seed, /service_shifts/);
  assert.match(seed, /business_hours/);
  assert.match(packageJson, /db:seed:restaurant:local/);
});

test('local restaurant seed stores floor-map positions as percentages', () => {
  const seed = source('scripts/seed-local-restaurant.mjs');
  const positions = [...seed.matchAll(/positionX: (\d+(?:\.\d+)?), positionY: (\d+(?:\.\d+)?)/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));

  assert.equal(positions.length, 14);
  assert.ok(positions.every(({ x, y }) => x >= 0 && x <= 100 && y >= 0 && y <= 100));
});

test('floor map guards invalid legacy positions and adapts table cards on mobile', () => {
  const floorMap = source('src/components/admin/AdminFloorMapView.tsx');

  assert.match(floorMap, /positionIsInsideCanvas/);
  assert.match(floorMap, /h-16 w-16/);
  assert.match(floorMap, /sm:h-20 sm:w-24/);
  assert.match(floorMap, /@xyflow\/react/);
  assert.match(floorMap, /combinationEdges/);
});
