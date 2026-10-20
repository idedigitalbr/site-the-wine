import { authJson } from '@/server/customer-auth/http';

export async function POST() {
  return authJson({ error: 'endpoint_retired', message: 'Esta consulta não está disponível.' }, 410);
}
