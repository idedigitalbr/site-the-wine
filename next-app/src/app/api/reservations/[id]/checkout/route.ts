import { authJson, readJsonBody } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { getCustomerSession } from '@/server/customer-auth/service';
import { getReservationCheckoutContext, startReservationCheckout } from '@/server/reservations/reservation-checkout';
import { demoCheckoutPolicy } from '@/server/payments/checkout-policy';
import { z } from 'zod';

export const runtime = 'nodejs';
function parseId(value: string): number | null { return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null; }
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCustomerSession(request);
    if (!session) return authJson({ error: 'unauthorized', message: 'Seu acesso expirou. Entre novamente para continuar.' }, 401);
    const id = parseId((await context.params).id);
    if (!id) return authJson({ error: 'invalid_id', message: 'Reserva inválida.' }, 400);
    const result = await getReservationCheckoutContext(id, session.user.id);
    if (!result) return authJson({ error: 'reservation_not_found', message: 'Não encontramos essa reserva.' }, 404);
    return authJson(result, 200, { 'Cache-Control': 'private, no-store' });
  } catch (error) {
    if (error instanceof Error && error.message === 'reservation_not_payable') return authJson({ error: 'reservation_not_payable', message: 'Esta reserva não pode receber pagamento.' }, 409);
    console.error('Reservation checkout context unavailable');
    return authJson({ error: 'checkout_unavailable', message: 'Não foi possível carregar os detalhes da reserva.' }, 503);
  }
}
const startSchema = z.object({
  operationKey: z.string().trim().min(8).max(80),
  method: z.enum(['pix', 'credit', 'debit']),
  quoteId: z.string().trim().min(1).max(160),
  totalAmountCents: z.number().int().positive(),
});

function checkoutFailure(error: unknown): Response {
  const code = error instanceof Error ? error.message : '';
  const conflict = new Set(['reservation_payment_deadline_passed', 'reservation_capacity_unavailable', 'reservation_not_payable', 'checkout_quote_changed', 'checkout_idempotency_conflict', 'checkout_pix_expired', 'checkout_pix_not_pending', 'payment_gateway_unavailable']);
  if (code === 'reservation_not_found') return authJson({ error: 'reservation_not_found', message: 'Não encontramos essa reserva.' }, 404);
  if (conflict.has(code)) return authJson({ error: code, message: code }, 409);
  if (code === 'reservation_checkout_not_started') return authJson({ error: code, message: 'O checkout desta reserva ainda não está disponível.' }, 409);
  console.error('Reservation checkout operation failed', error);
  return authJson({ error: 'checkout_unavailable', message: 'Não foi possível processar o checkout agora.' }, 503);
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const session = await getCustomerSession(request);
  if (!session) return authJson({ error: 'unauthorized', message: 'Seu acesso expirou. Entre novamente para continuar.' }, 401);
  const id = parseId((await context.params).id);
  if (!id) return authJson({ error: 'invalid_id', message: 'Reserva inválida.' }, 400);
  const body = await readJsonBody(request);
  if (!body) return authJson({ error: 'invalid_json' }, 400);
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) return authJson({ error: 'invalid_input', fields: parsed.error.issues.map((issue) => issue.path.join('.')) }, 400);
  try {
    const result = await startReservationCheckout(id, session.user.id, { ...parsed.data, pixTtlSeconds: demoCheckoutPolicy.pixTtlSeconds });
    return authJson(result, 200, { 'Cache-Control': 'private, no-store' });
  } catch (error) {
    return checkoutFailure(error);
  }
}
