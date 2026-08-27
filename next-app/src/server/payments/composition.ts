import { PaymentGatewayDisabledError } from '@/modules/payments/application/payment-errors';
import { paymentResponseData } from '@/modules/payments/application/create-payment';
import type { PaymentWebhookInput } from '@/modules/payments/application/process-webhook';
import type { CreatePaymentInput } from '@/modules/payments/application/ports';
import { MysqlPaymentRepository } from '@/modules/payments/infrastructure/mysql-payment-repository';

const paymentRepository = new MysqlPaymentRepository();

export async function createMercadoPagoPayment(_input: CreatePaymentInput): Promise<{ payment: Record<string, unknown>; replayed: boolean }> {
  throw new PaymentGatewayDisabledError();
}

export async function getPayment(id: number) {
  const payment = await paymentRepository.findById(id);
  return payment ? paymentResponseData(payment) : null;
}

export function refundMercadoPagoPayment(_input: unknown, _requestedByEmail: string | null): Promise<{ paymentId: number; refundId: number; replayed: boolean }> {
  throw new PaymentGatewayDisabledError();
}

export function processMercadoPagoWebhook(_input: PaymentWebhookInput): Promise<{ duplicate: boolean; ignored: boolean; paymentId: number | null }> {
  throw new PaymentGatewayDisabledError();
}
