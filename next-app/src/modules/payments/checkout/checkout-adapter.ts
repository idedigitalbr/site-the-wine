import type { CheckoutMethod, CheckoutPaymentResult } from './checkout-contract';
export type CheckoutRequest = { reservationId: number; quoteId: string; idempotencyKey: string } & ({ method: 'pix'; payer: { fullName: string; cpf: string } } | { method: 'credit' | 'debit'; card: { token: string; paymentMethodId: string; installments: number } });
export interface CheckoutPaymentAdapter { create(request: CheckoutRequest, signal: AbortSignal): Promise<CheckoutPaymentResult>; getStatus(paymentId: string, signal: AbortSignal): Promise<CheckoutPaymentResult>; }
