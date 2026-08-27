import { normalizePaymentAmount } from '../domain/payment';
import type { PaymentGateway, PaymentRepository } from './ports';

export type RefundPaymentInput = {
  paymentId: number;
  amount?: number;
  reason?: string | null;
  idempotencyKey: string;
  requestedByEmail?: string | null;
};

export type RefundPaymentDependencies = {
  payments: PaymentRepository;
  gateway: PaymentGateway;
};

function getRefundAmount(input: RefundPaymentInput, paymentAmount: number): number {
  return normalizePaymentAmount(input.amount ?? paymentAmount);
}

function getRefundErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Refund gateway error';
}

async function executeGatewayRefund(
  externalId: string,
  refundId: number,
  amount: number,
  idempotencyKey: string,
  dependencies: RefundPaymentDependencies,
): Promise<void> {
  try {
    const gatewayRefund = await dependencies.gateway.refundPayment({
      externalId,
      amount,
      idempotencyKey,
    });
    await dependencies.payments.attachGatewayRefund(refundId, gatewayRefund);
  } catch (error) {
    await dependencies.payments.markRefundFailure(refundId, getRefundErrorMessage(error));
    throw error;
  }
}

export async function refundPayment(
  input: RefundPaymentInput,
  dependencies: RefundPaymentDependencies,
): Promise<{ paymentId: number; refundId: number; replayed: boolean }> {
  const payment = await dependencies.payments.findById(input.paymentId);
  if (!payment) throw new Error('Payment not found');
  if (!payment.externalId) throw new Error('Payment has no gateway id');
  const amount = getRefundAmount(input, payment.amount);
  const refund = await dependencies.payments.createRefund({
    paymentId: payment.id,
    provider: dependencies.gateway.provider,
    amount,
    reason: input.reason ?? null,
    idempotencyKey: input.idempotencyKey,
    requestedByEmail: input.requestedByEmail ?? null,
  });
  if (!refund.created) return { paymentId: payment.id, refundId: refund.refundId, replayed: true };

  await executeGatewayRefund(
    payment.externalId,
    refund.refundId,
    amount,
    input.idempotencyKey,
    dependencies,
  );
  return { paymentId: payment.id, refundId: refund.refundId, replayed: false };
}
