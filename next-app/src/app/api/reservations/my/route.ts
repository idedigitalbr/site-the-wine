import { authJson } from '@/server/customer-auth/http';
import { getCustomerSession } from '@/server/customer-auth/service';
import { createCustomerReservationsHandler } from '@/server/reservations/customer-reservations-handler';
import { listReservationsForAuthUser } from '@/server/reservations/list-customer-reservations';

export const runtime = 'nodejs';

export const GET = createCustomerReservationsHandler({
  getSession: getCustomerSession,
  list: listReservationsForAuthUser,
  json: authJson,
  reportError: () => console.error('Customer reservation listing unavailable'),
});
