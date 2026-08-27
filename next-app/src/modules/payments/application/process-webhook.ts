import type { PaymentGateway, PaymentRepository, WebhookEventRepository } from './ports';

export type PaymentWebhookInput = {
  externalEventId: string;
  requestId: string | null;
  eventType: string;
  action: string | null;
  signature: string | null;
  dataId: string | null;
  payload: string;
};

export type ProcessPaymentWebhookDependencies = {
  payments: PaymentRepository;
  webhooks: WebhookEventRepository;
  gateway: PaymentGateway;
};

export async function processPaymentWebhook(
  input: PaymentWebhookInput,
  dependencies: ProcessPaymentWebhookDependencies,
): Promise<{ duplicate: boolean; ignored: boolean; paymentId: number | null }> {
  const event = await dependencies.webhooks.register(dependencies.gateway.provider, input);
  if (event.status !== 'processing') return { duplicate: true, ignored: event.status === 'ignored', paymentId: null };

  try {
    if (input.eventType !== 'payment' || !input.dataId) {
      await dependencies.webhooks.recordPaymentEvent({
        paymentId: null,
        provider: dependencies.gateway.provider,
        externalEventId: input.externalEventId,
        eventType: input.eventType,
        action: input.action,
        providerStatus: null,
        payload: input.payload,
      });
      await dependencies.webhooks.markIgnored(event.id, 'Unsupported webhook event');
      return { duplicate: false, ignored: true, paymentId: null };
    }

    const payment = await dependencies.payments.findByExternalId(dependencies.gateway.provider, input.dataId);
    if (!payment) {
      await dependencies.webhooks.markIgnored(event.id, 'Payment not found for webhook');
      return { duplicate: false, ignored: true, paymentId: null };
    }
    const gatewayPayment = await dependencies.gateway.fetchPayment(input.dataId);
    const updatedPayment = await dependencies.payments.applyGatewayPayment(payment.id, gatewayPayment);
    await dependencies.webhooks.recordPaymentEvent({
      paymentId: payment.id,
      provider: dependencies.gateway.provider,
      externalEventId: input.externalEventId,
      eventType: input.eventType,
      action: input.action,
      providerStatus: gatewayPayment.providerStatus,
      payload: input.payload,
    });
    await dependencies.webhooks.markProcessed(event.id);
    return { duplicate: false, ignored: false, paymentId: updatedPayment.id };
  } catch (error) {
    await dependencies.webhooks.markFailed(event.id, error instanceof Error ? error.message : 'Webhook processing error');
    throw error;
  }
}
