import { authJson, addAuthCookies } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { signOutCustomer } from '@/server/customer-auth/service';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  try {
    const headers = await signOutCustomer(request);
    return addAuthCookies(authJson({ status: 'signed_out' }), headers);
  } catch {
    return authJson({ error: 'sign_out_unavailable' }, 503);
  }
}
