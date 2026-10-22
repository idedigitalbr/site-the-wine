import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('public checkout exposes an isolated demonstrative payment flow', () => {
  const contract = source('src/modules/payments/checkout/checkout-adapter.ts');
  const adapter = source('src/modules/payments/checkout/demo-checkout-adapter.ts');
  const checkout = source('src/components/reservation/v2/ReservationCheckout.tsx');

  assert.match(contract, /CheckoutPaymentAdapter/);
  assert.match(adapter, /DemoCheckoutAdapter/);
  assert.match(adapter, /confirmDemoPix/);
  assert.match(adapter, /mode: 'demo'/);
  assert.doesNotMatch(adapter, /MERCADOPAGO|fetch\(/i);
  assert.match(checkout, /fetchReservationCheckout/);
  assert.match(checkout, /nenhuma cobrança/i);
});

test('admin configuration clearly labels payment mode as mock', () => {
  const configuration = source('src/components/admin/AdminConfigurationView.tsx');
  assert.match(configuration, /Modo demonstrativo ativo/);
  assert.match(configuration, />MOCK<\/span>/);
  assert.match(configuration, /Nenhuma cobrança ou chamada ao Mercado Pago/);
});

test('payment APIs remain disabled while the gateway decision is pending', () => {
  const composition = source('src/server/payments/composition.ts');
  const paymentErrors = source('src/modules/payments/application/payment-errors.ts');
  const paymentRoute = source('src/app/api/payments/route.ts');
  const refundRoute = source('src/app/api/payments/[id]/refund/route.ts');
  const webhookRoute = source('src/app/api/webhooks/mercado-pago/route.ts');

  assert.match(paymentErrors, /PaymentGatewayDisabledError/);
  assert.match(composition, /PaymentGatewayDisabledError/);
  assert.doesNotMatch(composition, /new MercadoPagoGateway/);
  assert.match(paymentRoute, /payment_mock_only/);
  assert.match(refundRoute, /payment_mock_only/);
  assert.match(webhookRoute, /payment_mock_only/);
});
