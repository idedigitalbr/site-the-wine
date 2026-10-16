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

test('confirmation canonical fingerprint changes when reservation content changes', async () => {
  const { canonicalReservationFingerprint } = await load('../src/modules/reservations/application/confirm-reservation-attempt.ts');
  const base = { date: '2026-10-16', time: '20:00', guests: 4, duration: 120, tableIds: [2], specialNeeds: [], notes: '' };
  assert.equal(canonicalReservationFingerprint(base), canonicalReservationFingerprint({ ...base, tableIds: [2] }));
  assert.notEqual(canonicalReservationFingerprint(base), canonicalReservationFingerprint({ ...base, guests: 5 }));
});

test('confirmation operation distinguishes replay, idempotency conflict and already confirmed attempt', async () => {
  const { classifyConfirmationOperation } = await load('../src/modules/reservations/application/confirm-reservation-attempt.ts');
  assert.equal(classifyConfirmationOperation({ status: 'completed', contentFingerprint: 'a' }, 'a'), 'replay');
  assert.equal(classifyConfirmationOperation({ status: 'completed', contentFingerprint: 'a' }, 'b'), 'idempotency_conflict');
  assert.equal(classifyConfirmationOperation(null, 'a'), 'new');
});
