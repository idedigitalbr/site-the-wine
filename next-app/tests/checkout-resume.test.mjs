import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCustomerReservationsModule } from './support/load-customer-reservations-module.mjs';

const { getResumedPayment } = loadCustomerReservationsModule(new URL('../src/modules/payments/checkout/checkout-resume.ts', import.meta.url));

function context(resume = {}) {
  return {
    reservation: { id: 42 },
    quote: { totalAmountCents: 15000 },
    resume: {
      method: null,
      state: null,
      pixExpiresAt: null,
      paymentId: null,
      pixDisplayCode: null,
      pixQrValue: null,
      paidAt: null,
      ...resume,
    },
  };
}

test('retoma Pix completo sem mutar o contexto', () => {
  const value = context({ state: 'pix_pending', method: 'pix', paymentId: 'p-1', pixDisplayCode: 'copy', pixQrValue: 'qr', pixExpiresAt: '2026-10-26T21:00:00.000Z' });
  const before = structuredClone(value);
  assert.deepEqual(getResumedPayment(value), {
    screen: 'pix',
    payment: {
      paymentId: 'p-1', reservationId: 42, method: 'pix', mode: 'demo', totalAmountCents: 15000,
      status: 'pending', pix: { displayCode: 'copy', qrValue: 'qr', expiresAt: '2026-10-26T21:00:00.000Z' },
    },
  });
  assert.deepEqual(value, before);
});

test('campos PIX ausentes, nulos ou vazios impedem a retomada', () => {
  for (const field of ['paymentId', 'pixDisplayCode', 'pixQrValue', 'pixExpiresAt']) {
    for (const missing of [undefined, null, '']) {
      const resume = { state: 'pix_pending', method: 'pix', paymentId: 'p-1', pixDisplayCode: 'copy', pixQrValue: 'qr', pixExpiresAt: 'expiry' };
      resume[field] = missing;
      assert.equal(getResumedPayment(context(resume)), null, `${field}=${String(missing)}`);
    }
  }
  assert.equal(getResumedPayment(context({ state: 'pix_pending', method: 'credit', paymentId: 'p', pixDisplayCode: 'c', pixQrValue: 'q', pixExpiresAt: 'e' })), null);
  assert.equal(getResumedPayment(context({ state: 'unknown', method: 'pix', paymentId: 'p', pixDisplayCode: 'c', pixQrValue: 'q', pixExpiresAt: 'e' })), null);
});

test('retoma estados concluídos com método informado ou crédito padrão', () => {
  for (const state of ['demo_completed', 'paid']) {
    assert.deepEqual(getResumedPayment(context({ state, method: null, paymentId: 'p-2', paidAt: '2026-10-26T20:00:00.000Z' })), {
      screen: 'success',
      payment: { paymentId: 'p-2', reservationId: 42, method: 'credit', mode: 'demo', totalAmountCents: 15000, status: 'paid', paidAt: '2026-10-26T20:00:00.000Z', demonstrative: true },
    });
    assert.equal(getResumedPayment(context({ state, method: 'debit', paymentId: 'p-2', paidAt: '2026-10-26T20:00:00.000Z' })).payment.method, 'debit');
    assert.equal(getResumedPayment(context({ state, method: 'credit', paymentId: null, paidAt: '2026-10-26T20:00:00.000Z' })), null);
    assert.equal(getResumedPayment(context({ state, method: 'credit', paymentId: 'p-2', paidAt: null })), null);
  }
});
