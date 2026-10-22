import { CustomerAuthError } from '@/server/customer-auth/errors';
import { authJson, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { getClientIpBucket, hasTrustedOrigin } from '@/server/customer-auth/origin';
import { verifyPasswordRecoveryCode } from '@/server/customer-auth/password-recovery';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object') {
    return authJson({ error: 'invalid_json', message: 'Digite o código de 6 dígitos.' }, 400);
  }

  const ip = getClientIpBucket(request);
  const rawId = String((body as { identifier?: unknown }).identifier ?? '').trim().toLowerCase().slice(0, 120);
  try {
    await recordRateLimitAttempt('recovery-verify-ip', ip, 15, 15 * 60_000);
    if (rawId) await recordRateLimitAttempt('recovery-verify-id', rawId, 8, 10 * 60_000);
    const result = await verifyPasswordRecoveryCode(body);
    return authJson(result, 200);
  } catch (error) {
    return error instanceof CustomerAuthError
      ? customerAuthErrorResponse(error)
      : authJson({ error: 'service_unavailable', message: 'Não foi possível verificar o código agora. Tente novamente.' }, 503);
  }
}
