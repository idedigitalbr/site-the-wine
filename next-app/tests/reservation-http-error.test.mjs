import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function load(relativePath) {
  const compiled = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: relativePath,
  });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
}

test('technical confirmation failures use the service unavailable contract', async () => {
  const { classifyReservationError } = await load('../src/server/reservations/reservation-http-error.ts');

  assert.deepEqual(classifyReservationError(new Error('Reservation replay encryption key is not configured')), {
    code: 'reservation_service_unavailable',
    status: 503,
  });
  assert.deepEqual(classifyReservationError(new Error('unexpected database failure')), {
    code: 'reservation_service_unavailable',
    status: 503,
  });
});

test('known reservation errors preserve their current public contracts', async () => {
  const { classifyReservationError } = await load('../src/server/reservations/reservation-http-error.ts');

  assert.deepEqual(classifyReservationError(new Error('Reservation unavailable: tables changed')), { code: 'reservation_unavailable', status: 409 });
  assert.deepEqual(classifyReservationError(new Error('Invalid reservation attempt operation')), { code: 'invalid_input', status: 400 });
  for (const code of ['idempotency_conflict', 'selection_outdated', 'attempt_owner_mismatch', 'attempt_expired', 'attempt_confirmed', 'attempt_invalidated']) {
    assert.deepEqual(classifyReservationError(new Error(code)), { code, status: 409 });
  }
  assert.deepEqual(classifyReservationError(new Error('reservation_confirmation_in_progress')), { code: 'confirmation_in_progress', status: 409 });
  assert.deepEqual(classifyReservationError(new Error('reservation_replay_expired')), { code: 'reservation_replay_expired', status: 410 });
});
