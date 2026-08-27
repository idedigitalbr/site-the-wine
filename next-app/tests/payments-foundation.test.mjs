import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('payments migration creates provider, refund and webhook ledgers', () => {
  const migration = source('../database/migrations/004_create_payments_webhooks.sql');
  for (const table of ['payments', 'payment_events', 'refunds', 'webhook_events']) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /payments_idempotency_uq/);
  assert.match(migration, /refunds_provider_idempotency_uq/);
  assert.match(migration, /webhook_events_provider_event_uq/);
  assert.match(migration, /status IN \('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded'\)/);
});

test('payment gateway contract supports Pix, card, refunds and provider isolation', () => {
  const ports = source('src/modules/payments/application/ports.ts');
  const gateway = source('src/modules/payments/infrastructure/mercado-pago-gateway.ts');
  assert.match(ports, /interface PaymentGateway/);
  assert.match(ports, /createPayment/);
  assert.match(ports, /refundPayment/);
  assert.match(gateway, /MERCADOPAGO_ACCESS_TOKEN/);
  assert.match(gateway, /payment_method_id: input\.method === 'pix' \? 'pix' : input\.cardPaymentMethodId/);
  assert.match(gateway, /X-Idempotency-Key/);
  assert.match(gateway, /\/v1\/payments/);
});

test('Mercado Pago webhook signature follows the signed manifest contract', () => {
  const signature = source('src/modules/payments/domain/webhook-signature.ts');
  const timestamp = 1704908010;
  const dataId = '999999999';
  const requestId = 'a2c8f3';
  const secret = 'test-secret';
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  assert.match(signature, /createHmac/);
  assert.match(signature, /id:\$\{dataId\};request-id:\$\{requestId\};ts:\$\{timestamp\};/);
  assert.equal(expected.length, 64);
});

test('payment and webhook APIs keep their application boundaries', () => {
  const paymentRoute = source('src/app/api/payments/route.ts');
  const webhookRoute = source('src/app/api/webhooks/mercado-pago/route.ts');
  const composition = source('src/server/payments/composition.ts');
  assert.match(paymentRoute, /requireAdminSession/);
  assert.match(paymentRoute, /createPaymentSchema/);
  assert.match(webhookRoute, /verifyMercadoPagoWebhookSignature/);
  assert.match(webhookRoute, /processMercadoPagoWebhook/);
  assert.doesNotMatch(paymentRoute, /mysql2|@\/server\/db/);
  assert.doesNotMatch(webhookRoute, /mysql2|@\/server\/db/);
  assert.match(composition, /MysqlPaymentRepository/);
});
