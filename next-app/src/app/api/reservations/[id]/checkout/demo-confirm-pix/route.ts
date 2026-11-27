import { z } from 'zod';
import { authJson, readJsonBody } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { getCustomerSession } from '@/server/customer-auth/service';
import { confirmReservationDemoPix } from '@/server/reservations/reservation-checkout';

export const runtime = 'nodejs';

const inputSchema = z.object({
  operationKey: z.string().trim().min(8).max(80),
  quoteId: z.string().trim().min(1).max(160),
  totalAmountCents: z.number().int().positive(),
});

function parseId(value: string): number | null {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
}

function failure(error: unknown): Response {
  const code = error instanceof Error ? error.message : '';
  const conflict = new Set(['reservation_payment_deadline_passed', 'reservation_capacity_unavailable', 'reservation_not_payable', 'checkout_quote_changed', 'checkout_idempotency_conflict', 'checkout_pix_expired', 'checkout_pix_not_pending']);
  if (code === 'reservation_not_found') return authJson({ error: code, message: 'Não encontramos essa reserva.' }, 404);
  if (conflict.has(code)) return authJson({ error: code, message: code }, 409);
  console.error('Demo Pix confirmation failed', error);
  return authJson({ error: 'checkout_unavailable', message: 'Não foi possível confirmar o Pix demonstrativo.' }, 503);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const session = await getCustomerSession(request);
  if (!session) return authJson({ error: 'unauthorized', message: 'Seu acesso expirou. Entre novamente para continuar.' }, 401);
  const id = parseId((await context.params).id);
  if (!id) return authJson({ error: 'invalid_id', message: 'Reserva inválida.' }, 400);
  const parsed = inputSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return authJson({ error: 'invalid_input', fields: parsed.error.issues.map((issue) => issue.path.join('.')) }, 400);
  try {
    const result = await confirmReservationDemoPix(id, session.user.id, parsed.data);
    return authJson(result, 200, { 'Cache-Control': 'private, no-store' });
  } catch (error) {
    return failure(error);
  }
}
