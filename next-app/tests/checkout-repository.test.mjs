import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { loadCustomerReservationsModule } from './support/load-customer-reservations-module.mjs';

const state = { reservation: null, session: null, operation: null, calls: [], commits: 0, rollbacks: 0, releases: 0 };
const connection = {
  async beginTransaction() {},
  async commit() { state.commits += 1; },
  async rollback() { state.rollbacks += 1; },
  release() { state.releases += 1; },
  async execute(sql, values) {
    state.calls.push({ sql, values });
    if (sql.includes('FROM reservations WHERE')) return [[state.reservation].filter(Boolean)];
    if (sql.includes('FROM reservation_checkout_sessions')) return [[state.session].filter(Boolean)];
    if (sql.includes('FROM reservation_checkout_operations')) return [[state.operation].filter(Boolean)];
    if (sql.includes('SELECT restaurant_table_id AS tableId')) return [[{ tableId: 1 }]];
    if (sql.includes('SELECT t.id, t.capacity_min')) return [[{ id: 1, capacityMin: 2, capacityMax: 4, areaId: 1 }]];
    if (sql.includes('SELECT DISTINCT rt.restaurant_table_id')) return [[]];
    if (sql.includes('SELECT DISTINCT t.id AS tableId')) return [[]];
    return [{ affectedRows: 1, insertId: 1 }];
  },
};

const { MysqlReservationCheckoutRepository } = loadCustomerReservationsModule(
  new URL('../src/modules/reservations/infrastructure/mysql-checkout-repository.ts', import.meta.url),
  {
    'node:crypto': { createHash },
    '@/server/db': { getDatabasePool: () => ({ getConnection: async () => connection }) },
    '../domain/reservation-allocation': { selectBestAvailableOption: () => null },
    './checkout-occupancy-sql': { activeReservationOccupancySql: '1 = 1' },
    '../domain/checkout-policy': { checkoutEligibility: () => ({ allowed: true, reason: null }), guaranteeIsActive: () => true },
  },
);

const input = { reservationId: 42, customerId: 7, method: 'credit', quoteId: 'demo-person-v1:42:3:5000', operationKey: 'op-12345678', totalAmountCents: 15000 };
const fingerprint = createHash('sha256').update(JSON.stringify({ reservationId: 42, method: 'credit', quoteId: input.quoteId, totalAmountCents: 15000 })).digest('hex');

function reset(overrides = {}) {
  state.reservation = { id: 42, customerId: 7, status: 'payment_pending', paymentDeadlineAt: new Date(Date.now() + 60000), seatGuaranteeExpiresAt: new Date(Date.now() + 1800000), ...overrides.reservation };
  state.session = { state: 'pending', method: null, pixExpiresAt: null, ...overrides.session };
  state.operation = overrides.operation ?? null;
  state.calls.length = 0; state.commits = 0; state.rollbacks = 0; state.releases = 0;
}

test('replay devolve objeto ou JSON mesmo depois do prazo, sem escritas', async () => {
  for (const resultJson of [{ paymentId: 'stored', reservationId: 42, method: 'credit', mode: 'demo', totalAmountCents: 15000, status: 'paid', paidAt: '2026-10-01T00:00:00.000Z' }, JSON.stringify({ paymentId: 'stored-json', reservationId: 42, method: 'credit', mode: 'demo', totalAmountCents: 15000, status: 'paid', paidAt: '2026-10-01T00:00:00.000Z' })]) {
    reset({ reservation: { paymentDeadlineAt: new Date(Date.now() - 1) }, operation: { requestFingerprint: fingerprint, resultJson } });
    const value = await new MysqlReservationCheckoutRepository().start(input);
    assert.equal(value.paymentId, resultJson.paymentId ?? 'stored-json');
    assert.equal(state.calls.filter((call) => /\b(INSERT INTO|UPDATE reservation|DELETE FROM)/.test(call.sql)).length, 0);
  }
});

test('fingerprint divergente faz rollback', async () => {
  reset({ operation: { requestFingerprint: 'different', resultJson: null } });
  await assert.rejects(() => new MysqlReservationCheckoutRepository().start(input), /checkout_idempotency_conflict/);
  assert.equal(state.rollbacks, 1);
});

test('checkout concluído retorna resultado demonstrativo sem nova operação', async () => {
  for (const overrides of [{ session: { state: 'paid', method: null } }, { session: { state: 'demo_completed', method: 'debit' } }, { reservation: { status: 'confirmed' }, session: { state: 'pending', method: null } }]) {
    reset(overrides);
    const value = await new MysqlReservationCheckoutRepository().start(input);
    assert.equal(value.paymentId, 'DEMO-42-completed');
    assert.equal(value.method, overrides.session?.method ?? 'credit');
    assert.equal(state.calls.filter((call) => /\b(INSERT INTO|UPDATE reservation|DELETE FROM)/.test(call.sql)).length, 0);
  }
});

test('prazo ausente ou atingido bloqueia no instante exato', async () => {
  for (const paymentDeadlineAt of [null, new Date(Date.now())]) {
    reset({ reservation: { paymentDeadlineAt } });
    await assert.rejects(() => new MysqlReservationCheckoutRepository().start(input), /reservation_payment_deadline_passed/);
  }
});

test('Pix atualiza sessão e registra operação na mesma transação', async () => {
  reset();
  const value = await new MysqlReservationCheckoutRepository().start({ ...input, method: 'pix' });
  assert.equal(value.status, 'pending');
  assert.ok(state.calls.some((call) => call.sql.includes('UPDATE reservation_checkout_sessions')));
  assert.ok(state.calls.some((call) => call.sql.includes('INSERT INTO reservation_checkout_operations')));
  assert.equal(state.commits, 1);
});

test('crédito e débito concluem reserva com mesa existente disponível', async () => {
  for (const method of ['credit', 'debit']) {
    reset();
    const value = await new MysqlReservationCheckoutRepository().start({ ...input, method });
    assert.equal(value.status, 'paid');
    assert.equal(value.method, method);
    assert.ok(state.calls.some((call) => call.sql.includes("SET status = 'confirmed'")));
    assert.ok(state.calls.some((call) => call.sql.includes("state = 'demo_completed'")));
    assert.ok(state.calls.some((call) => call.sql.includes('INSERT INTO reservation_checkout_operations')));
  }
});
