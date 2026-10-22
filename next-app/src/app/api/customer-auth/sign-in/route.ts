import { customerCpfSchema } from '@/modules/customer-auth/domain/customer-auth-schema';
import { authJson, addAuthCookies, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { hasTrustedOrigin, getClientIpBucket } from '@/server/customer-auth/origin';
import { clearRateLimit, recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';
import { signInCustomer } from '@/server/customer-auth/service';
import { CustomerAuthError } from '@/server/customer-auth/errors';
import { hashCustomerCpf } from '@/server/customer-auth/crypto';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin' }, 403);
  const body = await readJsonBody(request);
  if (!isCredentialsBody(body)) {
    return authJson({ error: 'invalid_json', message: 'Confira os dados de acesso.' }, 400);
  }
  const input = body as { cpf: unknown; password: unknown };
  const cpf = customerCpfSchema.safeParse(input.cpf);
  if (!cpf.success || !isPasswordInput(input.password)) {
    return authJson({ error: 'invalid_credentials', message: 'CPF ou senha incorretos.' }, 401);
  }

  const ip = getClientIpBucket(request);
  const cpfBucket = hashCustomerCpf(cpf.data);
  try {
    await recordRateLimitAttempt('sign-in-ip', ip, 20, 15 * 60_000);
    await recordRateLimitAttempt('sign-in-cpf', cpfBucket, 5, 15 * 60_000);
    const result = await signInCustomer(request, cpf.data, input.password);
    await clearRateLimit('sign-in-cpf', cpfBucket);
    return addAuthCookies(authJson(result.response), result.headers);
  } catch (error) {
    return error instanceof CustomerAuthError
      ? customerAuthErrorResponse(error)
      : authJson({ error: 'service_unavailable', message: 'Não foi possível concluir agora. Tente novamente.' }, 503);
  }
}

function isCredentialsBody(body: unknown): body is { cpf: unknown; password: unknown } {
  return typeof body === 'object' && body !== null && 'cpf' in body && 'password' in body;
}

function isPasswordInput(password: unknown): password is string {
  return typeof password === 'string' && password.length > 0 && password.length <= 128;
}
