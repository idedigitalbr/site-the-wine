import { CustomerAuthError } from '@/server/customer-auth/errors';
import { authJson, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { getClientIpBucket, hasTrustedOrigin } from '@/server/customer-auth/origin';
import { requestPasswordRecoveryCode } from '@/server/customer-auth/password-recovery';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object') {
    return authJson({ error: 'invalid_json', message: 'Digite seu e-mail ou CPF.' }, 400);
  }

  const ip = getClientIpBucket(request);
  const rawId = String((body as { identifier?: unknown }).identifier ?? '').trim().toLowerCase().slice(0, 120);
  try {
    await recordRateLimitAttempt('recovery-request-ip', ip, 10, 15 * 60_000);
    if (rawId) await recordRateLimitAttempt('recovery-request-id', rawId, 5, 10 * 60_000);
    const result = await requestPasswordRecoveryCode(body);
    return authJson(result, 200);
  } catch (error) {
    return error instanceof CustomerAuthError
      ? customerAuthErrorResponse(error)
      : authJson({ error: 'service_unavailable', message: 'Não foi possível enviar o código agora. Tente novamente em instantes.' }, 503);
  }
}
