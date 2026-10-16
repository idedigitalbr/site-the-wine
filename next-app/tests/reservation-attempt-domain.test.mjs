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

test('attempt domain enforces owner, state and monotonic revision', async () => {
  const { assertAttemptOwner, assertAttemptRevision, advanceAttemptRevision } = await load('../src/modules/reservations/domain/reservation-attempt.ts');
  const attempt = {
    attemptId: 'attempt-1', flowId: 'flow-1', userId: 'user-1', customerId: 10,
    sessionTokenHash: 'session-1', revision: 4, state: 'active', selection: null,
  };

  assert.doesNotThrow(() => assertAttemptOwner(attempt, { userId: 'user-1', customerId: 10, sessionTokenHash: 'session-1' }));
  assert.throws(() => assertAttemptOwner(attempt, { userId: 'user-2', customerId: 10, sessionTokenHash: 'session-2' }), /attempt_owner_mismatch/);
  assert.doesNotThrow(() => assertAttemptRevision(attempt, 4));
  assert.throws(() => assertAttemptRevision(attempt, 3), /selection_outdated/);
  assert.equal(advanceAttemptRevision(attempt, 4, { date: '2026-10-16' }).revision, 5);
});

test('attempt domain refuses writes after confirmation or expiry', async () => {
  const { assertAttemptWritable } = await load('../src/modules/reservations/domain/reservation-attempt.ts');

  assert.throws(() => assertAttemptWritable({ state: 'confirmed' }), /attempt_confirmed/);
  assert.throws(() => assertAttemptWritable({ state: 'expired' }), /attempt_expired/);
  assert.doesNotThrow(() => assertAttemptWritable({ state: 'active' }));
});
