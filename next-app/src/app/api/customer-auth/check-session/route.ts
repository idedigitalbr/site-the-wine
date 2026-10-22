import { authJson, addAuthCookies, readJsonBody } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { findReservationFlow } from '@/server/customer-auth/repository';
import { getCustomerSession, signOutCustomer } from '@/server/customer-auth/service';

const reservationStages = new Set(['data', 'time', 'preferences']);

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!isValidBody(body)) {
    return authJson({ error: 'invalid_input' }, 400);
  }
  const input = body as { flowId: unknown; stage: unknown };
  if (!isValidFlowInput(input)) {
    return authJson({ error: 'invalid_input' }, 400);
  }

  try {
    return await validateSessionFlow(request, input.flowId);
  } catch {
    return authJson({ error: 'session_check_unavailable', message: 'Não foi possível verificar seu acesso. Tente novamente.' }, 503);
  }
}

async function validateSessionFlow(request: Request, flowId: string) {
  const session = await getCustomerSession(request);
  if (!session) return expireSession(request);
  const flow = await findReservationFlow(flowId);
  if (!flow || Number(flow.is_expired)) return authJson({ error: 'flow_expired', message: 'Esta reserva expirou. Inicie uma nova reserva.' }, 409);
  if (flow.user_id !== session.user.id) return changedSession(request);
  return authJson({ status: 'valid' });
}

async function expireSession(request: Request) {
  const headers = await signOutCustomer(request);
  return addAuthCookies(authJson({ error: 'session_expired', message: 'Sua sessão expirou. Acesse novamente para continuar.' }, 401), headers);
}

async function changedSession(request: Request) {
  const headers = await signOutCustomer(request);
  return addAuthCookies(authJson({ error: 'account_changed', message: 'Sua conta mudou. Acesse novamente para continuar.' }, 409), headers);
}

function isValidBody(body: unknown): body is { flowId: unknown; stage: unknown } {
  return typeof body === 'object' && body !== null && 'flowId' in body && 'stage' in body;
}

function isValidFlowInput(input: { flowId: unknown; stage: unknown }): input is { flowId: string; stage: string } {
  return typeof input.flowId === 'string' && input.flowId.length === 43 && typeof input.stage === 'string' && reservationStages.has(input.stage);
}
