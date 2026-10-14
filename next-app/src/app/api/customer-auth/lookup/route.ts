import { customerCpfSchema } from '@/modules/customer-auth/domain/customer-auth-schema';
import { recordRateLimitAttempt } from '@/server/customer-auth/rate-limit';
import { authJson, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { findAccountForCpf } from '@/server/customer-auth/service';
import { getClientIpBucket } from '@/server/customer-auth/origin';
import { CustomerAuthError } from '@/server/customer-auth/errors';

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body || typeof body !== 'object' || !('cpf' in body)) {
    return authJson({ error: 'invalid_json', message: 'Não foi possível ler o CPF.' }, 400);
  }
  const cpf = customerCpfSchema.safeParse(body.cpf);
  if (!cpf.success) return authJson({ error: 'invalid_cpf', message: 'Confira os 11 números do CPF.' }, 400);

  try {
    await recordRateLimitAttempt('lookup-ip', getClientIpBucket(request), 30, 60_000);
    const account = await findAccountForCpf(cpf.data);
    return authJson({ status: account ? 'exists' : 'available' });
  } catch (error) {
    if (error instanceof CustomerAuthError) return customerAuthErrorResponse(error);
    return authJson({ error: 'lookup_unavailable', message: 'Não foi possível consultar agora. Tente novamente.' }, 503);
  }
}
