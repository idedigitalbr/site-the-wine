import { normalizePaymentAmount } from '../domain/payment';
import type {
  CreatePaymentInput,
  GatewayPayment,
  PaymentGateway,
  PaymentRepository,
} from './ports';
import type { Payment } from '../domain/payment';

export type CreatePaymentDependencies = {
  payments: PaymentRepository;
  gateway: PaymentGateway;
  notificationUrl: string;
};

export type CreatedPayment = {
  payment: Payment;
  replayed: boolean;
};

function gatewayPaymentInput(input: CreatePaymentInput, externalReference: string, notificationUrl: string): Parameters<PaymentGateway['createPayment']>[0] {
  return {
    amount: normalizePaymentAmount(input.amount),
    currency: 'BRL',
    description: input.description,
    externalReference,
    idempotencyKey: input.idempotencyKey,
    method: input.method,
    payerEmail: input.payerEmail,
    cardToken: input.cardToken,
    cardPaymentMethodId: input.cardPaymentMethodId,
    notificationUrl,
  };
}

export async function createPayment(
  input: CreatePaymentInput,
  dependencies: CreatePaymentDependencies,
): Promise<CreatedPayment> {
  const existing = await dependencies.payments.findByIdempotencyKey(dependencies.gateway.provider, input.idempotencyKey);
  if (existing) return { payment: existing, replayed: true };
  const reservationId = await dependencies.payments.getReservationId(input.reservationId);
  if (!reservationId) throw new Error('Reservation not found');

  const pending = await dependencies.payments.createPending({
    ...input,
    amount: normalizePaymentAmount(input.amount),
    provider: dependencies.gateway.provider,
  });
  if (!pending.created) return { payment: pending.payment, replayed: true };

  try {
    const gatewayPayment = await dependencies.gateway.createPayment(
      gatewayPaymentInput(input, String(pending.payment.id), dependencies.notificationUrl),
    );
    return { payment: await dependencies.payments.attachGatewayPayment(pending.payment.id, gatewayPayment), replayed: false };
  } catch (error) {
    await dependencies.payments.markGatewayFailure(pending.payment.id, error instanceof Error ? error.message : 'Payment gateway error');
    throw error;
  }
}

export function paymentResponseData(payment: Exclude<CreatedPayment['payment'], null>): Record<string, unknown> {
  return {
    id: payment.id,
    reservationId: payment.reservationId,
    provider: payment.provider,
    externalId: payment.externalId,
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
    providerStatus: payment.providerStatus,
    description: payment.description,
    checkoutUrl: payment.checkoutUrl,
    pixQrCode: payment.pixQrCode,
    pixCopyPaste: payment.pixCopyPaste,
    paidAt: payment.paidAt,
    refundedAt: payment.refundedAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}
