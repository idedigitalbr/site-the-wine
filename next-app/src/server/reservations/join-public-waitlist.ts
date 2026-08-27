import { randomBytes } from 'node:crypto';
import { joinWaitlist } from '@/modules/reservations/application/join-waitlist';
import type { CreatedWaitlistEntry } from '@/modules/reservations/application/ports';
import type { PublicWaitlistInput } from '@/modules/reservations/schemas/public-reservation-schema';
import { MysqlCustomerRepository } from '@/modules/reservations/infrastructure/mysql-customer-repository';
import { MysqlWaitlistRepository } from '@/modules/reservations/infrastructure/mysql-waitlist-repository';

const customerRepository = new MysqlCustomerRepository();
const waitlistRepository = new MysqlWaitlistRepository();

function createWaitlistCode(): string {
  return `WL-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export function submitPublicWaitlist(input: PublicWaitlistInput): Promise<CreatedWaitlistEntry> {
  return joinWaitlist({
    referenceCode: createWaitlistCode(),
    reservationDate: input.date,
    preferredTime: input.preferredTime,
    guestCount: input.guests,
    name: input.name,
    phone: input.phone,
    email: input.email,
    notes: input.notes,
  }, {
    customers: customerRepository,
    waitlist: waitlistRepository,
  });
}
