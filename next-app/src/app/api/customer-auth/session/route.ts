import { authJson } from '@/server/customer-auth/http';
import { getCustomerSession } from '@/server/customer-auth/service';

export async function GET(request: Request) {
  try {
    const session = await getCustomerSession(request);
    return authJson(session
      ? { status: 'authenticated', user: { id: session.user.id, name: session.user.name } }
      : { status: 'anonymous' });
  } catch {
    return authJson({ error: 'session_unavailable', message: 'Não foi possível verificar seu acesso.' }, 503);
  }
}
