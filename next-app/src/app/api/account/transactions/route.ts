import { authJson, customerAuthErrorResponse } from '@/server/customer-auth/http';
import { getAccountTransactionsForRequest } from '@/server/account-settings/service';

export async function GET(request: Request) {
  try {
    const data = await getAccountTransactionsForRequest(request);
    return authJson(data, 200);
  } catch (error) {
    return customerAuthErrorResponse(error);
  }
}
