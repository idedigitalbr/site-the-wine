import type { PaymentStatus } from './payment';

export function paymentStatusFromGateway(status: string): PaymentStatus {
  const statusMap: Record<string, PaymentStatus> = {
    approved: 'paid',
    in_process: 'processing',
    pending: 'processing',
    cancelled: 'cancelled',
    refunded: 'refunded',
    partially_refunded: 'partially_refunded',
    rejected: 'failed',
    charged_back: 'failed',
  };
  return statusMap[status] ?? 'processing';
}
