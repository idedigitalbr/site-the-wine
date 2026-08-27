import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('public checkout exposes an isolated demonstrative payment flow', () => {
  const mockPayment = source('src/modules/payments/demo/mock-payment.ts');
  const demo = source('src/components/reservation/v2/MockPaymentDemo.tsx');
  const wizard = source('src/components/reservation/v2/ReservationWizard.tsx');

  assert.match(mockPayment, /mockPaymentMethods = \['pix', 'card'\]/);
  assert.match(mockPayment, /mockPaymentScenarios = \['approved', 'processing', 'failed'\]/);
  assert.match(mockPayment, /DEMO-/);
  assert.doesNotMatch(mockPayment, /MERCADOPAGO|fetch\(/i);
  assert.match(demo, /Nenhuma cobrança, chamada ao Mercado Pago ou webhook real/);
  assert.match(demo, /Simular aprovação/);
  assert.match(demo, /Simular recusa/);
  assert.match(wizard, /MockPaymentDemo/);
  assert.doesNotMatch(wizard, /fetch\(['"]\/api\/payments/);
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
