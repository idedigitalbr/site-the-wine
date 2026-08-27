import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function loadTypeScriptModule(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: relativePath,
  });
  const encoded = Buffer.from(compiled.outputText).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

test('reservation status transitions remain centralized and deterministic', async () => {
  const { assertTransition, canTransition } = await loadTypeScriptModule(
    '../src/modules/reservations/domain/reservation-status.ts',
  );

  assert.equal(canTransition('draft', 'confirmed'), true);
  assert.equal(canTransition('confirmed', 'draft'), false);
  assert.doesNotThrow(() => assertTransition('hold', 'payment_pending'));
  assert.throws(() => assertTransition('completed', 'confirmed'), /Invalid reservation transition/);
});

test('reservation policy enforces date, time window and guest limits', async () => {
  const { validateReservationWindow } = await loadTypeScriptModule(
    '../src/modules/reservations/domain/reservation-policy.ts',
  );

  assert.deepEqual(validateReservationWindow({
    reservationDate: '2026-09-01',
    startTime: '19:00',
    endTime: '21:00',
    guestCount: 4,
  }), []);
  assert.deepEqual(validateReservationWindow({
    reservationDate: '2026-02-30',
    startTime: '21:00',
    endTime: '19:00',
    guestCount: 21,
  }), ['reservationDate', 'timeWindow', 'guestCount']);
});
