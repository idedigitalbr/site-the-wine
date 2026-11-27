import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCustomerReservationsModule } from './support/load-customer-reservations-module.mjs';

let customerId = 7;
let record = null;
const policyInputs = [];
const queryCalls = [];

class QueryMock {
  async findOwned(reservationId, ownerId) {
    queryCalls.push([reservationId, ownerId]);
    return record;
  }
}
class RepositoryMock {}

const { getReservationCheckoutContext } = loadCustomerReservationsModule(
  new URL('../src/server/reservations/reservation-checkout.ts', import.meta.url),
  {
    'server-only': {},
    '@/modules/reservations/infrastructure/mysql-reservation-checkout-query': { MysqlReservationCheckoutQuery: QueryMock },
    '@/server/customer-auth/repository': { findCustomerIdByAuthUserId: async () => customerId },
    '@/server/payments/checkout-policy': { demoCheckoutPolicy: { mode: 'demo', unitAmountCents: 5000, pricingVersion: 'demo-person-v1', currency: 'BRL', installments: [1], pixTtlSeconds: 1800, canCharge: false } },
    '@/modules/reservations/domain/checkout-policy': {
      checkoutEligibility: (input) => { policyInputs.push(input); return input.status === 'confirmed' ? { allowed: false, reason: 'reservation_payment_deadline_passed' } : { allowed: true, reason: null }; },
      guaranteeIsActive: (input) => { policyInputs.push(input); return input.status === 'payment_pending'; },
    },
    '@/modules/reservations/infrastructure/mysql-checkout-repository': { MysqlReservationCheckoutRepository: RepositoryMock },
  },
);

function baseRecord(overrides = {}) {
  return {
    id: 42, publicCode: 'TW-42', status: 'payment_pending', date: '2026-10-26', time: '20:00', durationMinutes: 120, guestCount: 3, specialNeeds: ['highchair'],
    serverNow: '2026-10-26T18:00:00.000Z', checkoutStartedAt: '2026-10-26T17:30:00.000Z', seatGuaranteeExpiresAt: '2026-10-26T18:00:00.000Z', paymentDeadlineAt: '2026-10-26T22:00:00.000Z',
    checkoutMode: 'demo', checkoutProgress: null, checkoutMethod: null, pixExpiresAt: null, lastPaymentId: null, pixDisplayCode: null, pixQrValue: null, paidAt: null, ...overrides,
  };
}

test('recusa cliente ausente, reserva ausente e status não pagável', async () => {
  record = baseRecord();
  customerId = null;
  assert.equal(await getReservationCheckoutContext(42, 'missing'), null);
  customerId = 7;
  record = null;
  assert.equal(await getReservationCheckoutContext(42, 'user'), null);
  record = baseRecord({ status: 'cancelled' });
  await assert.rejects(() => getReservationCheckoutContext(42, 'user'), /reservation_not_payable/);
});

test('usa o cliente autenticado e compartilha uma entrada baseada no serverNow', async () => {
  customerId = 7;
  record = baseRecord({ checkoutProgress: 'pix_pending', checkoutMethod: 'pix', pixExpiresAt: '2026-10-26T19:00:00.000Z', lastPaymentId: 'p-1', pixDisplayCode: 'copy', pixQrValue: 'qr', paidAt: null });
  queryCalls.length = 0;
  policyInputs.length = 0;
  const value = await getReservationCheckoutContext(42, 'user');
  assert.deepEqual(queryCalls.at(-1), [42, 7]);
  assert.equal(policyInputs.length, 2);
  assert.strictEqual(policyInputs[0], policyInputs[1]);
  assert.equal(policyInputs[0].now.toISOString(), '2026-10-26T18:00:00.000Z');
  assert.equal(policyInputs[0].checkoutStartedAt.toISOString(), '2026-10-26T17:30:00.000Z');
  assert.equal(policyInputs[0].seatGuaranteeExpiresAt.toISOString(), '2026-10-26T18:00:00.000Z');
  assert.equal(value.mode, 'demo');
  assert.equal(value.quote.totalAmountCents, 15000);
  assert.equal(value.checkoutProgress, 'pix_pending');
  assert.equal(value.resume.paymentId, 'p-1');
  assert.deepEqual(value.capabilities.methods, ['pix', 'credit', 'debit']);
});

test('modo live vira gateway e elegibilidade negativa é preservada', async () => {
  record = baseRecord({ status: 'confirmed', checkoutMode: 'live', checkoutStartedAt: null, seatGuaranteeExpiresAt: null, paymentDeadlineAt: null, checkoutProgress: null });
  policyInputs.length = 0;
  const value = await getReservationCheckoutContext(42, 'user');
  assert.equal(value.mode, 'gateway');
  assert.deepEqual(value.eligibility, { allowed: false, reason: 'reservation_payment_deadline_passed' });
  assert.equal(value.checkoutProgress, 'pending');
  assert.equal(value.guaranteeActive, false);
});
