import { authenticatedPublicReservationSchema } from '@/modules/reservations/schemas/public-reservation-schema';
import { authJson, addAuthCookies, readJsonBody } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { ensureCustomerForAuthUser, findReservationFlow } from '@/server/customer-auth/repository';
import { getCustomerSession, signOutCustomer } from '@/server/customer-auth/service';
import { getReservationSessionTokenHash } from '@/server/reservations/session';
import { submitPublicReservation } from '@/server/reservations/create-public-reservation';
import { classifyReservationError } from '@/server/reservations/reservation-http-error';

type CustomerProfile = Awaited<ReturnType<typeof ensureCustomerForAuthUser>>;
type IdentityResult = { customer: CustomerProfile; userId: string } | { response: Response };

async function resolveReservationCustomer(request: Request, flowId: string): Promise<IdentityResult> {
  const session = await getCustomerSession(request);
  if (!session) {
    const cookies = await signOutCustomer(request);
    return { response: addAuthCookies(authJson({ error: 'session_expired', message: 'Sua sessão expirou. Acesse novamente para continuar.' }, 401), cookies) };
  }

  const flow = await findReservationFlow(flowId);
  if (!flow) return { response: authJson({ error: 'flow_expired', message: 'Esta reserva expirou. Inicie uma nova reserva.' }, 409) };
  if (flow.user_id !== session.user.id) {
    const cookies = await signOutCustomer(request);
    return { response: addAuthCookies(authJson({ error: 'account_changed', message: 'Sua conta mudou. Acesse novamente para continuar.' }, 409), cookies) };
  }
  if (Number(flow.is_expired)) return { response: authJson({ error: 'flow_expired', message: 'Esta reserva expirou. Inicie uma nova reserva.' }, 409) };

  const customer = await ensureCustomerForAuthUser(session.user.id);
  if (customer.id !== flow.customer_id) return { response: authJson({ error: 'flow_invalid' }, 409) };
  return { customer, userId: session.user.id };
}

function reservationFailure(error: unknown) {
  const classified = classifyReservationError(error);
  if (classified.status === 503) console.error('Public reservation creation failed', error);
  if (classified.status === 503) {
    return authJson({
      error: 'reservation_service_unavailable',
      message: 'Não foi possível concluir agora. Tente novamente.',
    }, 503);
  }
  return authJson({ error: classified.code }, classified.status);
}

function parseReservationRequest(body: unknown) {
  const rawBody = body as Record<string, unknown>;
  return authenticatedPublicReservationSchema.safeParse({ ...rawBody, allocationMode: rawBody.allocationMode ?? 'legacy' });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!body) return authJson({ error: 'invalid_json' }, 400);

  const parsed = parseReservationRequest(body);
  if (!parsed.success) return authJson({
    error: 'invalid_input',
    fields: parsed.error.issues.map((issue) => issue.path.join('.')),
  }, 400);

  try {
    const identity = await resolveReservationCustomer(request, parsed.data.flowId);
    if ('response' in identity) return identity.response;
    const sessionTokenHash = await getReservationSessionTokenHash();
    if (!sessionTokenHash) return authJson({ error: 'hold_required' }, 409);
    const result = await submitPublicReservation(parsed.data, sessionTokenHash, { ...identity.customer, userId: identity.userId });
    return authJson(result, 201);
  } catch (error) {
    return reservationFailure(error);
  }
}
