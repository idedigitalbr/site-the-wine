import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/modules/reservations/domain/checkout-policy.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
runInNewContext(compiled, { exports, Date, Intl });

test('payment is allowed before the exact two-hour cutoff and blocked at the cutoff', () => {
  const deadline = new Date('2026-10-22T22:00:00.000Z');
  const base = { checkoutStartedAt: new Date('2026-10-22T19:00:00.000Z'), seatGuaranteeExpiresAt: new Date('2026-10-22T19:30:00.000Z'), paymentDeadlineAt: deadline, status: 'payment_pending' };
  assert.equal(exports.checkoutEligibility({ ...base, now: new Date('2026-10-22T21:59:59.999Z') }).allowed, true);
  const blocked = exports.checkoutEligibility({ ...base, now: deadline });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'reservation_payment_deadline_passed');
});

test('guarantee ends after thirty minutes without cancelling the pending reservation', () => {
  const base = { checkoutStartedAt: new Date('2026-10-22T19:00:00.000Z'), seatGuaranteeExpiresAt: new Date('2026-10-22T19:30:00.000Z'), paymentDeadlineAt: new Date('2026-10-22T22:00:00.000Z'), status: 'payment_pending' };
  assert.equal(exports.guaranteeIsActive({ ...base, now: new Date('2026-10-22T19:29:59.999Z') }), true);
  assert.equal(exports.guaranteeIsActive({ ...base, now: new Date('2026-10-22T19:30:00.000Z') }), false);
  assert.equal(exports.checkoutEligibility({ ...base, now: new Date('2026-10-22T19:30:00.000Z') }).allowed, true);
});

test('deadline calculation uses establishment timezone and adds two hours', () => {
  const deadline = exports.reservationPaymentDeadlineAt('2026-10-23', '20:00', 'America/Sao_Paulo');
  assert.equal(deadline.toISOString(), '2026-10-24T01:00:00.000Z');
});
