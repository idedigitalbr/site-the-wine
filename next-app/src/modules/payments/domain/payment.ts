export const paymentStatuses = [
  'pending',
  'processing',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
] as const;

export type PaymentStatus = typeof paymentStatuses[number];
export type PaymentMethod = 'pix' | 'card';

const transitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ['processing', 'paid', 'failed', 'cancelled'],
  processing: ['paid', 'failed', 'cancelled'],
  paid: ['refunded', 'partially_refunded'],
  failed: ['pending', 'cancelled'],
  cancelled: [],
  refunded: [],
  partially_refunded: ['refunded'],
};

export function isPaymentStatus(value: string): value is PaymentStatus {
  return paymentStatuses.includes(value as PaymentStatus);
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return from === to || transitions[from].includes(to);
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Invalid payment transition: ${from} -> ${to}`);
  }
}

export function normalizePaymentAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid payment amount');
  const normalized = Math.round(amount * 100) / 100;
  if (normalized > 99999999.99) throw new Error('Invalid payment amount');
  return normalized;
}

export type Payment = {
  id: number;
  reservationId: number;
  provider: string;
  externalId: string | null;
  idempotencyKey: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  currency: 'BRL';
  providerStatus: string | null;
  description: string;
  payerEmail: string;
  checkoutUrl: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
