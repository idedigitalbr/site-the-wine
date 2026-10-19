import type { CustomerReservationsResponse } from '@/types/customer-reservations';
import type { CustomerReservationQueryRepository } from './ports';

export type ListCustomerReservationsDependencies = {
  findCustomerIdByAuthUserId: (userId: string) => Promise<number | null>;
  reservations: CustomerReservationQueryRepository;
  calculateDuration: (startTime: string, endTime: string) => number | null;
};

export async function listCustomerReservations(
  userId: string,
  offset: number,
  dependencies: ListCustomerReservationsDependencies,
): Promise<CustomerReservationsResponse> {
  const customerId = await dependencies.findCustomerIdByAuthUserId(userId);
  if (customerId === null) return { reservations: [], nextOffset: null };

  const records = await dependencies.reservations.listByCustomerId(customerId, {
    offset,
    limit: 21,
  });
  const visibleRecords = records.slice(0, 20);

  return {
    reservations: visibleRecords.map((record) => ({
      id: record.id,
      reservationDate: record.reservationDate,
      startTime: record.startTime,
      durationMinutes: dependencies.calculateDuration(record.startTime, record.endTime),
      guestCount: record.guestCount,
      status: record.status,
      specialNeeds: record.specialNeeds,
      notes: record.notes,
    })),
    nextOffset: records.length === 21 ? offset + 20 : null,
  };
}
