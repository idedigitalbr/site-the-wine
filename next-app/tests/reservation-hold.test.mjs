import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

function compile(sourceText, fileName) {
  const compiled = ts.transpileModule(sourceText, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName,
  });
  return `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`;
}

async function loadHoldModule() {
  const availabilityUrl = compile(
    source('../src/modules/reservations/domain/availability.ts'),
    '../src/modules/reservations/domain/availability.ts',
  );
  const holdSource = source('../src/modules/reservations/domain/hold.ts')
    .replace("from './availability';", `from '${availabilityUrl}';`);
  return import(compile(holdSource, '../src/modules/reservations/domain/hold.ts'));
}

test('reservation hold policy uses an eight-minute window and rejects unsafe selections', async () => {
  const { assertValidReservationHoldSelection, reservationHoldDurationMinutes } = await loadHoldModule();

  assert.equal(reservationHoldDurationMinutes, 8);
  assert.doesNotThrow(() => assertValidReservationHoldSelection({
    reservationDate: '2026-09-01',
    startTime: '19:00',
    endTime: '21:00',
    guestCount: 4,
    durationMinutes: 120,
    tableIds: [2, 3],
    sessionTokenHash: 'session-hash',
  }));
  assert.throws(() => assertValidReservationHoldSelection({
    reservationDate: '2026-09-01',
    startTime: '19:00',
    endTime: '21:00',
    guestCount: 4,
    durationMinutes: 120,
    tableIds: [2, 2],
    sessionTokenHash: 'session-hash',
  }), /duplicate tables/);
  assert.throws(() => assertValidReservationHoldSelection({
    reservationDate: '2026-09-01',
    startTime: '19:00',
    endTime: '21:00',
    guestCount: 4,
    durationMinutes: 120,
    tableIds: [],
    sessionTokenHash: 'session-hash',
  }), /table selection is required/);
});

test('hold flow protects the reservation window across public and administrative contracts', () => {
  const migration = source('../../database/migrations/003_add_reservation_hold_window.sql');
  const repository = source('../src/modules/reservations/infrastructure/mysql-reservation-repository.ts');
  const holdRoute = source('../src/app/api/reservations/hold/route.ts');
  const reservationRoute = source('../src/app/api/reservations/route.ts');
  const session = source('../src/server/reservations/session.ts');
  const wizard = source('../src/components/reservation/v2/ReservationWizard.tsx');

  assert.match(migration, /reservation_starts_at/);
  assert.match(migration, /reservation_ends_at/);
  assert.match(migration, /information_schema/);
  assert.match(repository, /beginTransaction\(\)/);
  assert.match(repository, /ORDER BY id FOR UPDATE/);
  assert.match(repository, /DELETE FROM reservation_holds WHERE expires_at <= CURRENT_TIMESTAMP/);
  assert.match(repository, /reservation_starts_at/);
  assert.match(repository, /reservation_ends_at/);
  assert.match(repository, /confirmWithHold/);
  assert.match(holdRoute, /status: 201/);
  assert.match(session, /thewine_reservation_session/);
  assert.match(session, /httpOnly: true/);
  assert.match(reservationRoute, /hold_required/);
  assert.match(wizard, /\/api\/reservations\/hold/);
  assert.match(wizard, /holdExpiresAt/);
});
