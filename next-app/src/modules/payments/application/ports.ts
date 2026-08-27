import type { Payment, PaymentMethod, PaymentStatus } from '../domain/payment';

export type CreateGatewayPaymentInput = {
  amount: number;
  currency: 'BRL';
  description: string;
  externalReference: string;
  idempotencyKey: string;
  method: PaymentMethod;
  payerEmail: string;
  cardToken?: string;
  cardPaymentMethodId?: string;
  notificationUrl: string;
};

export type GatewayPayment = {
  externalId: string;
  status: PaymentStatus;
  providerStatus: string;
  checkoutUrl: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
};

export type CreateGatewayRefundInput = {
  externalId: string;
  amount: number;
  idempotencyKey: string;
};

export type GatewayRefund = {
  externalId: string;
  status: 'processed' | 'pending' | 'failed';
};

export interface PaymentGateway {
  readonly provider: string;
  createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPayment>;
  fetchPayment(externalId: string): Promise<GatewayPayment>;
  refundPayment(input: CreateGatewayRefundInput): Promise<GatewayRefund>;
}

export type CreatePaymentInput = {
  reservationId: number;
  amount: number;
  method: PaymentMethod;
  payerEmail: string;
  description: string;
  idempotencyKey: string;
  cardToken?: string;
  cardPaymentMethodId?: string;
};

export type PaymentRepository = {
  findById(id: number): Promise<Payment | null>;
  findByIdempotencyKey(provider: string, idempotencyKey: string): Promise<Payment | null>;
  findByExternalId(provider: string, externalId: string): Promise<Payment | null>;
  getReservationId(reservationId: number): Promise<number | null>;
  createPending(input: CreatePaymentInput & { provider: string }): Promise<{ payment: Payment; created: boolean }>;
  attachGatewayPayment(id: number, gatewayPayment: GatewayPayment): Promise<Payment>;
  markGatewayFailure(id: number, errorMessage: string): Promise<void>;
  applyGatewayPayment(id: number, gatewayPayment: GatewayPayment): Promise<Payment>;
  createRefund(input: { paymentId: number; provider: string; amount: number; reason: string | null; idempotencyKey: string; requestedByEmail: string | null }): Promise<{ refundId: number; created: boolean }>;
  attachGatewayRefund(id: number, refund: GatewayRefund): Promise<void>;
  markRefundFailure(id: number, errorMessage: string): Promise<void>;
};

export type WebhookEvent = {
  id: number;
  provider: string;
  externalEventId: string;
  status: 'received' | 'processing' | 'processed' | 'ignored' | 'failed';
};

export type WebhookEventRepository = {
  register(provider: string, event: { externalEventId: string; requestId: string | null; eventType: string; action: string | null; signature: string | null; payload: string }): Promise<WebhookEvent>;
  markProcessed(id: number): Promise<void>;
  markIgnored(id: number, reason: string): Promise<void>;
  markFailed(id: number, errorMessage: string): Promise<void>;
  recordPaymentEvent(input: { paymentId: number | null; provider: string; externalEventId: string; eventType: string; action: string | null; providerStatus: string | null; payload: string }): Promise<void>;
};
