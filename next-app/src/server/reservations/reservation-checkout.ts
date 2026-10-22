import 'server-only';
import type { CheckoutContext } from '@/modules/payments/checkout/checkout-contract';
import { MysqlReservationCheckoutQuery } from '@/modules/reservations/infrastructure/mysql-reservation-checkout-query';
import { findCustomerIdByAuthUserId } from '@/server/customer-auth/repository';
import { demoCheckoutPolicy } from '@/server/payments/checkout-policy';

const checkoutQuery = new MysqlReservationCheckoutQuery();
const payableStatuses = new Set(['pending', 'payment_pending', 'confirmed']);

export async function getReservationCheckoutContext(reservationId: number, userId: string): Promise<CheckoutContext | null> {
  const customerId = await findCustomerIdByAuthUserId(userId);
  if (!customerId) return null;
  const reservation = await checkoutQuery.findOwned(reservationId, customerId);
  if (!reservation) return null;
  if (!payableStatuses.has(reservation.status)) throw new Error('reservation_not_payable');
  const totalAmountCents = demoCheckoutPolicy.unitAmountCents * reservation.guestCount;
  return {
    mode: demoCheckoutPolicy.mode,
    reservation: { id: reservation.id, publicCode: reservation.publicCode, status: reservation.status },
    summary: { date: reservation.date, time: reservation.time, durationMinutes: reservation.durationMinutes, guestCount: reservation.guestCount, specialNeeds: reservation.specialNeeds },
    quote: { id: `${demoCheckoutPolicy.pricingVersion}:${reservation.id}:${reservation.guestCount}:${demoCheckoutPolicy.unitAmountCents}`, currency: demoCheckoutPolicy.currency, unitAmountCents: demoCheckoutPolicy.unitAmountCents, totalAmountCents, pricingVersion: demoCheckoutPolicy.pricingVersion, illustrative: true },
    capabilities: { methods: ['pix', 'credit', 'debit'], installments: demoCheckoutPolicy.installments, pixTtlSeconds: demoCheckoutPolicy.pixTtlSeconds, canCharge: demoCheckoutPolicy.canCharge },
  };
}
