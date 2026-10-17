import { authJson, addAuthCookies, readJsonBody } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { findReservationFlow } from '@/server/customer-auth/repository';
import { getCustomerSession, signOutCustomer } from '@/server/customer-auth/service';

const reservationStages = new Set(['data', 'time', 'preferences']);

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object' || !('flowId' in body) || !('stage' in body)) {
    return authJson({ error: 'invalid_input' }, 400);
  }
  const input = body as { flowId: unknown; stage: unknown };
  if (typeof input.flowId !== 'string' || input.flowId.length !== 43 || typeof input.stage !== 'string' || !reservationStages.has(input.stage)) {
    return authJson({ error: 'invalid_input' }, 400);
  }

  try {
    const session = await getCustomerSession(request);
    if (!session) {
      const headers = await signOutCustomer(request);
      return addAuthCookies(authJson({ error: 'session_expired', message: 'Sua sessão expirou. Acesse novamente para continuar.' }, 401), headers);
    }
    const flow = await findReservationFlow(input.flowId);
    if (!flow) return authJson({ error: 'flow_expired', message: 'Esta reserva expirou. Inicie uma nova reserva.' }, 409);
    if (flow.user_id !== session.user.id) {
      const headers = await signOutCustomer(request);
      return addAuthCookies(authJson({ error: 'account_changed', message: 'Sua conta mudou. Acesse novamente para continuar.' }, 409), headers);
    }
    if (Number(flow.is_expired)) return authJson({ error: 'flow_expired', message: 'Esta reserva expirou. Inicie uma nova reserva.' }, 409);
    return authJson({ status: 'valid' });
  } catch {
    return authJson({ error: 'session_check_unavailable', message: 'Não foi possível verificar seu acesso. Tente novamente.' }, 503);
  }
}
