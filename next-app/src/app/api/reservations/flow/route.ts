import { createReservationFlowId } from '@/server/customer-auth/crypto';
import { authJson, addAuthCookies } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { createReservationFlow, ensureCustomerForAuthUser } from '@/server/customer-auth/repository';
import { getCustomerSession, signOutCustomer } from '@/server/customer-auth/service';
import { getOrCreateReservationAttempt } from '@/server/reservations/attempt';
import { attachReservationSession, createReservationSessionToken, getReservationSessionToken, hashReservationSessionToken } from '@/server/reservations/session';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  try {
    const session = await getCustomerSession(request);
    if (!session) {
      const headers = await signOutCustomer(request);
      return addAuthCookies(authJson({ error: 'session_expired' }, 401), headers);
    }
    const customer = await ensureCustomerForAuthUser(session.user.id);
    const flowId = createReservationFlowId();
    await createReservationFlow(flowId, session.user.id, customer.id, session.expiresAt);
    const existingSessionToken = await getReservationSessionToken();
    const reservationSessionToken = existingSessionToken ?? createReservationSessionToken();
    const attempt = await getOrCreateReservationAttempt({
      flowId,
      userId: session.user.id,
      customerId: customer.id,
      sessionTokenHash: hashReservationSessionToken(reservationSessionToken),
      expiresAt: session.expiresAt,
    });
    const response = authJson({ flowId, attemptId: attempt.attemptId, revision: attempt.revision });
    return existingSessionToken ? response : attachReservationSession(response, reservationSessionToken);
  } catch {
    return authJson({ error: 'flow_unavailable', message: 'Não foi possível preparar sua reserva.' }, 503);
  }
}
