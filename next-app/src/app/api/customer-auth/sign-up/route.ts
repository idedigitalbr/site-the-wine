import { authJson, addAuthCookies, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { getClientIpBucket, hasTrustedOrigin } from '@/server/customer-auth/origin';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';
import { signUpCustomer } from '@/server/customer-auth/service';
import { CustomerAuthError } from '@/server/customer-auth/errors';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!body) return authJson({ error: 'invalid_json', message: 'Confira os dados do cadastro.' }, 400);

  try {
    await recordRateLimitAttempt('sign-up-ip', getClientIpBucket(request), 5, 60 * 60_000);
    const result = await signUpCustomer(request, body);
    return addAuthCookies(authJson(result.response, 201), result.headers);
  } catch (error) {
    return error instanceof CustomerAuthError
      ? customerAuthErrorResponse(error)
      : authJson({ error: 'service_unavailable', message: 'Não foi possível concluir agora. Tente novamente.' }, 503);
  }
}
