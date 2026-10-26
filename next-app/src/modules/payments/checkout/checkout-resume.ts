import type { CheckoutContext, CheckoutPaymentResult } from './checkout-contract';

export type ResumedCheckout = {
  screen: 'pix' | 'success';
  payment: CheckoutPaymentResult;
};

function resumePixPayment(value: CheckoutContext): ResumedCheckout | null {
  const resume = value.resume;
  if (resume.state !== 'pix_pending' || resume.method !== 'pix') return null;
  if (!resume.paymentId || !resume.pixDisplayCode || !resume.pixQrValue || !resume.pixExpiresAt) return null;
  return {
    screen: 'pix',
    payment: {
      paymentId: resume.paymentId,
      reservationId: value.reservation.id,
      method: 'pix',
      mode: 'demo',
      totalAmountCents: value.quote.totalAmountCents,
      status: 'pending',
      pix: { displayCode: resume.pixDisplayCode, qrValue: resume.pixQrValue, expiresAt: resume.pixExpiresAt },
    },
  };
}

function resumeCompletedPayment(value: CheckoutContext): ResumedCheckout | null {
  const resume = value.resume;
  if (resume.state !== 'demo_completed' && resume.state !== 'paid') return null;
  if (!resume.paymentId || !resume.paidAt) return null;
  return {
    screen: 'success',
    payment: {
      paymentId: resume.paymentId,
      reservationId: value.reservation.id,
      method: resume.method ?? 'credit',
      mode: 'demo',
      totalAmountCents: value.quote.totalAmountCents,
      status: 'paid',
      paidAt: resume.paidAt,
      demonstrative: true,
    },
  };
}

export function getResumedPayment(value: CheckoutContext): ResumedCheckout | null {
  return resumePixPayment(value) ?? resumeCompletedPayment(value);
}
