import { normalizePhone } from '@/modules/customers/domain/customer';
import type { CustomerRepository, CreatedWaitlistEntry, WaitlistRepository } from './ports';

export type JoinWaitlistInput = {
  referenceCode: string;
  reservationDate: string;
  preferredTime: string | null;
  guestCount: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
};

export type JoinWaitlistDependencies = {
  customers: CustomerRepository;
  waitlist: WaitlistRepository;
};

export async function joinWaitlist(
  input: JoinWaitlistInput,
  dependencies: JoinWaitlistDependencies,
): Promise<CreatedWaitlistEntry> {
  if (input.guestCount < 1 || input.guestCount > 20) throw new Error('Invalid waitlist guests');
  const customerId = await dependencies.customers.upsert({
    name: input.name,
    phone: input.phone,
    normalizedPhone: normalizePhone(input.phone),
    email: input.email,
    marketingConsent: false,
  });
  const waitlistId = await dependencies.waitlist.create({
    customerId,
    reservationDate: input.reservationDate,
    preferredTime: input.preferredTime,
    guestCount: input.guestCount,
    notes: input.notes,
  });
  return { waitlistId, referenceCode: input.referenceCode, status: 'waiting' };
}
