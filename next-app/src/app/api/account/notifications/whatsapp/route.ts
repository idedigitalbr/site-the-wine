import { authJson, customerAuthErrorResponse, readJsonBody } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { updateAccountWhatsAppForRequest } from '@/server/account-settings/service';

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return authJson({ error: 'untrusted_origin', message: 'Origem não autorizada.' }, 403);
  const body = await readJsonBody(request);
  if (!body) return authJson({ error: 'invalid_json', message: 'Dados inválidos.' }, 400);
  try {
    const result = await updateAccountWhatsAppForRequest(request, body);
    return authJson(result, 200);
  } catch (error) {
    return customerAuthErrorResponse(error);
  }
}
