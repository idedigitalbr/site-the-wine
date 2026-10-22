import { checkoutContextSchema, type CheckoutContext, type CheckoutMethod, type CheckoutPaymentResult } from '@/modules/payments/checkout/checkout-contract';
export async function fetchReservationCheckout(reservationId: number, signal?: AbortSignal): Promise<CheckoutContext> { const response = await fetch(`/api/reservations/${reservationId}/checkout`, { cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json' }, signal }); if (!response.ok) { const payload = await response.json().catch(() => ({})) as { error?: string; message?: string }; const error = new Error(payload.message ?? 'Não foi possível carregar os detalhes da reserva.'); error.name = payload.error ?? `checkout_${response.status}`; throw error; } return checkoutContextSchema.parse(await response.json()); }

type CheckoutCommandInput = { reservationId: number; operationKey: string; method: CheckoutMethod; quoteId: string; totalAmountCents: number };

async function command(url: string, body: unknown): Promise<CheckoutPaymentResult> {
  const response = await fetch(url, { method: 'POST', cache: 'no-store', credentials: 'same-origin', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as { error?: string; message?: string };
  if (!response.ok) { const error = new Error(payload.message ?? 'Não foi possível processar o checkout.'); error.name = payload.error ?? `checkout_${response.status}`; throw error; }
  return payload as unknown as CheckoutPaymentResult;
}

export function startReservationCheckout(input: CheckoutCommandInput): Promise<CheckoutPaymentResult> {
  return command(`/api/reservations/${input.reservationId}/checkout`, { operationKey: input.operationKey, method: input.method, quoteId: input.quoteId, totalAmountCents: input.totalAmountCents });
}

export function confirmDemoPix(input: Omit<CheckoutCommandInput, 'method'>): Promise<CheckoutPaymentResult> {
  return command(`/api/reservations/${input.reservationId}/checkout/demo-confirm-pix`, { operationKey: input.operationKey, quoteId: input.quoteId, totalAmountCents: input.totalAmountCents });
}
