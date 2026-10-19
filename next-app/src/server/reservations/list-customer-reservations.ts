import 'server-only';
import { customerReservationsResponseSchema } from '@/lib/customer-reservations-schema';
import { listCustomerReservations } from '@/modules/reservations/application/list-customer-reservations';
import { calculateCustomerReservationDuration } from '@/modules/reservations/domain/customer-reservation-duration';
import { MysqlCustomerReservationQueryRepository } from '@/modules/reservations/infrastructure/mysql-customer-reservation-query';
import { findCustomerIdByAuthUserId } from '@/server/customer-auth/repository';

const reservations = new MysqlCustomerReservationQueryRepository();

export async function listReservationsForAuthUser(userId: string, offset: number) {
  const response = await listCustomerReservations(userId, offset, {
    findCustomerIdByAuthUserId,
    reservations,
    calculateDuration: calculateCustomerReservationDuration,
  });
  return customerReservationsResponseSchema.parse(response);
}
