import { CustomerAuthError } from '@/server/customer-auth/errors';
import { authJson, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { getClientIpBucket, hasTrustedOrigin } from '@/server/customer-auth/origin';
import { resetCustomerPassword } from '@/server/customer-auth/password-recovery';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object') {
    return authJson({ error: 'invalid_json', message: 'Confira os dados da nova senha.' }, 400);
  }

  const ip = getClientIpBucket(request);
  try {
    await recordRateLimitAttempt('recovery-reset-ip', ip, 10, 15 * 60_000);
    const result = await resetCustomerPassword(body);
    return authJson(result, 200);
  } catch (error) {
    return error instanceof CustomerAuthError
      ? customerAuthErrorResponse(error)
      : authJson({ error: 'service_unavailable', message: 'Não foi possível salvar sua nova senha agora. Tente novamente.' }, 503);
  }
}
