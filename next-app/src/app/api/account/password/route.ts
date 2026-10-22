import { addAuthCookies, authJson, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { changeAccountPasswordForRequest } from '@/server/account-settings/service';

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin', message: 'Origem não autorizada.' }, 403);
  const body = await readJsonBody(request);
  if (!body) return authJson({ error: 'invalid_json', message: 'Dados inválidos.' }, 400);
  try {
    const result = await changeAccountPasswordForRequest(request, body);
    return addAuthCookies(authJson(result.response, 200), result.headers);
  } catch (error) {
    return customerAuthErrorResponse(error);
  }
}
