import type { CheckoutPaymentResult } from './checkout-contract';
import type { CheckoutPaymentAdapter, CheckoutRequest } from './checkout-adapter';
export class UnavailableCheckoutAdapter implements CheckoutPaymentAdapter { create(_request: CheckoutRequest, _signal: AbortSignal): Promise<CheckoutPaymentResult> { return Promise.reject(new Error('gateway_not_available')); } getStatus(_paymentId: string, _signal: AbortSignal): Promise<CheckoutPaymentResult> { return Promise.reject(new Error('gateway_not_available')); } }
