import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('public reservation confirmation exposes a capability link without storing the raw token', () => {
  const creation = source('src/server/reservations/create-public-reservation.ts');
  const confirmation = source('src/components/reservation/v2/ReservationWizard.tsx');

  assert.match(creation, /randomBytes\(32\)\.toString\('base64url'\)/);
  assert.match(creation, /createHash\('sha256'\)\.update\(raw\)/);
  assert.match(creation, /PublicReservationConfirmation/);
  assert.match(confirmation, /\/minha-reserva\/\$\{reservation\.secureToken\}/);
});

test('reservation portal reads by token hash and enforces cancellation transitions', () => {
  const application = source('src/modules/reservations/application/portal-reservation.ts');
  const repository = source('src/modules/reservations/infrastructure/mysql-reservation-repository.ts');
  const route = source('src/app/api/reservations/portal/cancel/route.ts');
  const component = source('src/components/reservation/portal/ReservationPortal.tsx');

  assert.match(application, /assertTransition\(reservation\.status, 'cancelled'\)/);
  assert.match(repository, /r\.confirmation_token_hash = \?/);
  assert.match(repository, /status IN \('hold', 'payment_pending', 'pending', 'confirmed'\)/);
  assert.match(route, /publicReservationPortalSchema/);
  assert.match(component, /Confirmar cancelamento/);
  assert.doesNotMatch(route, /MERCADOPAGO|payments/i);
});

test('reservation portal provides a public-code lookup without weakening private cancellation', () => {
  const schema = source('src/modules/reservations/schemas/portal-reservation-schema.ts');
  const repository = source('src/modules/reservations/infrastructure/mysql-reservation-repository.ts');
  const application = source('src/modules/reservations/application/portal-reservation.ts');
  const server = source('src/server/reservations/portal.ts');
  const lookupRoute = source('src/app/api/reservations/portal/lookup/route.ts');
  const component = source('src/components/reservation/portal/ReservationPortal.tsx');

  assert.match(schema, /publicReservationLookupSchema/);
  assert.match(repository, /findByPublicCode/);
  assert.match(application, /findPortalReservationByCode/);
  assert.match(server, /getPublicReservationByCode/);
  assert.match(lookupRoute, /publicReservationLookupSchema/);
  assert.match(component, /Código da reserva/);
  assert.match(component, /portal\/lookup/);
  assert.match(component, /secureToken &&/);
});
