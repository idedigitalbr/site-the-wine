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

function repository() {
  const attempts = new Map();
  return {
    attempts,
    async findByFlowId(flowId) { return [...attempts.values()].find((attempt) => attempt.flowId === flowId) ?? null; },
    async create(input) {
      const attempt = { ...input, revision: 0, state: 'active', selection: null };
      attempts.set(attempt.attemptId, attempt);
      return attempt;
    },
    async updateIfRevision(attemptId, expectedRevision, update) {
      const current = attempts.get(attemptId);
      if (!current || current.revision !== expectedRevision) return null;
      const next = { ...current, ...update };
      attempts.set(attemptId, next);
      return next;
    },
  };
}

test('attempt service reuses one active attempt for concurrent initialization', async () => {
  const { createReservationAttemptService } = await load('../src/modules/reservations/application/reservation-attempt-service.ts');
  const repo = repository();
  const service = createReservationAttemptService(repo, () => 'attempt-1');
  const input = { flowId: 'flow-1', userId: 'user-1', customerId: 10, sessionTokenHash: 'session-1', expiresAt: '2099-01-01' };
  const [first, second] = await Promise.all([service.getOrCreate(input), service.getOrCreate(input)]);
  assert.equal(first.attemptId, second.attemptId);
  assert.equal(repo.attempts.size, 1);
});

test('attempt service rejects stale revisions and account changes', async () => {
  const { createReservationAttemptService } = await load('../src/modules/reservations/application/reservation-attempt-service.ts');
  const repo = repository();
  const service = createReservationAttemptService(repo, () => 'attempt-1');
  const input = { flowId: 'flow-1', userId: 'user-1', customerId: 10, sessionTokenHash: 'session-1', expiresAt: '2099-01-01' };
  const attempt = await service.getOrCreate(input);
  await service.advanceSelection({ ...input, attemptId: attempt.attemptId, expectedRevision: 0, selection: { date: '2026-10-16' } });
  await assert.rejects(() => service.advanceSelection({ ...input, attemptId: attempt.attemptId, expectedRevision: 0, selection: { date: '2026-10-17' } }), /selection_outdated/);
  await assert.rejects(() => service.getOrCreate({ ...input, userId: 'user-2', sessionTokenHash: 'session-2' }), /attempt_owner_mismatch/);
});
