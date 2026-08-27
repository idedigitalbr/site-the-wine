import { calculateEndTime } from '@/modules/reservations/domain/availability';
import { confirmDraftReservation, createDraftReservation } from '@/modules/reservations/domain/reservation';
import { normalizePhone } from '@/modules/customers/domain/customer';
import type { AdminRepository } from './ports';
import type { CustomerRepository } from '@/modules/reservations/application/ports';

export type CreateWalkInReservationInput = {
  publicCode: string;
  reservationDate: string;
  startTime: string;
  durationMinutes: number;
  guestCount: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  tableIds: number[];
};

export type CreateWalkInReservationDependencies = {
  admin: AdminRepository;
  customers: CustomerRepository;
};

export async function createWalkInReservation(
  input: CreateWalkInReservationInput,
  dependencies: CreateWalkInReservationDependencies,
): Promise<number> {
  const customerId = await dependencies.customers.upsert({
    name: input.name,
    phone: input.phone,
    normalizedPhone: normalizePhone(input.phone),
    email: input.email,
    marketingConsent: false,
  });
  const draft = createDraftReservation({
    publicCode: input.publicCode,
    customerId,
    reservationDate: input.reservationDate,
    startTime: input.startTime,
    endTime: calculateEndTime(input.startTime, input.durationMinutes),
    guestCount: input.guestCount,
    source: 'walk_in',
    notes: input.notes,
  });
  const reservation = confirmDraftReservation(draft);
  return dependencies.admin.createWalkInReservation({ reservation, tableIds: input.tableIds });
}
