import { createReservationFlowId } from '@/server/customer-auth/crypto';
import { authJson, addAuthCookies } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { createReservationFlow, ensureCustomerForAuthUser } from '@/server/customer-auth/repository';
import { getCustomerSession, signOutCustomer } from '@/server/customer-auth/service';

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
    return authJson({ flowId });
  } catch {
    return authJson({ error: 'flow_unavailable', message: 'Não foi possível preparar sua reserva.' }, 503);
  }
}
