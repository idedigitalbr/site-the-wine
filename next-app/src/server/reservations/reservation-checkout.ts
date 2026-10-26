import 'server-only';
import type { CheckoutContext } from '@/modules/payments/checkout/checkout-contract';
import { MysqlReservationCheckoutQuery, type ReservationCheckoutRecord } from '@/modules/reservations/infrastructure/mysql-reservation-checkout-query';
import { findCustomerIdByAuthUserId } from '@/server/customer-auth/repository';
import { demoCheckoutPolicy } from '@/server/payments/checkout-policy';
import { checkoutEligibility, guaranteeIsActive, type CheckoutPolicyInput } from '@/modules/reservations/domain/checkout-policy';
import { MysqlReservationCheckoutRepository, type CheckoutPixConfirmationInput, type CheckoutStartInput } from '@/modules/reservations/infrastructure/mysql-checkout-repository';

const checkoutQuery = new MysqlReservationCheckoutQuery();
const checkoutRepository = new MysqlReservationCheckoutRepository();
const payableStatuses = new Set(['pending', 'payment_pending', 'confirmed']);

function checkoutPolicyInput(reservation: ReservationCheckoutRecord): CheckoutPolicyInput {
  return {
    now: new Date(reservation.serverNow),
    checkoutStartedAt: reservation.checkoutStartedAt ? new Date(reservation.checkoutStartedAt) : null,
    seatGuaranteeExpiresAt: reservation.seatGuaranteeExpiresAt ? new Date(reservation.seatGuaranteeExpiresAt) : null,
    paymentDeadlineAt: reservation.paymentDeadlineAt ? new Date(reservation.paymentDeadlineAt) : null,
    status: reservation.status,
  };
}

// This assembler keeps the API contract in one place; the policy itself remains in the domain module.
export async function getReservationCheckoutContext(reservationId: number, userId: string): Promise<CheckoutContext | null> {
  const customerId = await findCustomerIdByAuthUserId(userId);
  if (!customerId) return null;
  const reservation = await checkoutQuery.findOwned(reservationId, customerId);
  if (!reservation) return null;
  if (!payableStatuses.has(reservation.status)) throw new Error('reservation_not_payable');
  const totalAmountCents = demoCheckoutPolicy.unitAmountCents * reservation.guestCount;
  const policyInput = checkoutPolicyInput(reservation);
  const eligibility = checkoutEligibility(policyInput);
  return {
    mode: reservation.checkoutMode === 'live' ? 'gateway' : demoCheckoutPolicy.mode,
    reservation: { id: reservation.id, publicCode: reservation.publicCode, status: reservation.status },
    summary: { date: reservation.date, time: reservation.time, durationMinutes: reservation.durationMinutes, guestCount: reservation.guestCount, specialNeeds: reservation.specialNeeds },
    quote: { id: `${demoCheckoutPolicy.pricingVersion}:${reservation.id}:${reservation.guestCount}:${demoCheckoutPolicy.unitAmountCents}`, currency: demoCheckoutPolicy.currency, unitAmountCents: demoCheckoutPolicy.unitAmountCents, totalAmountCents, pricingVersion: demoCheckoutPolicy.pricingVersion, illustrative: true },
    capabilities: { methods: ['pix', 'credit', 'debit'], installments: demoCheckoutPolicy.installments, pixTtlSeconds: demoCheckoutPolicy.pixTtlSeconds, canCharge: demoCheckoutPolicy.canCharge },
    serverNow: reservation.serverNow,
    checkoutStartedAt: reservation.checkoutStartedAt,
    seatGuaranteeExpiresAt: reservation.seatGuaranteeExpiresAt,
    paymentDeadlineAt: reservation.paymentDeadlineAt,
    timeZone: process.env.RESERVATION_ESTABLISHMENT_TIMEZONE?.trim() || 'America/Sao_Paulo',
    guaranteeActive: guaranteeIsActive(policyInput),
    checkoutProgress: reservation.checkoutProgress ?? 'pending',
    eligibility,
    resume: { method: reservation.checkoutMethod, state: reservation.checkoutProgress, pixExpiresAt: reservation.pixExpiresAt, paymentId: reservation.lastPaymentId, pixDisplayCode: reservation.pixDisplayCode, pixQrValue: reservation.pixQrValue, paidAt: reservation.paidAt },
  };
}

export async function startReservationCheckout(
  reservationId: number,
  userId: string,
  input: Omit<CheckoutStartInput, 'reservationId' | 'customerId'>,
): Promise<Awaited<ReturnType<MysqlReservationCheckoutRepository['start']>>> {
  const customerId = await findCustomerIdByAuthUserId(userId);
  if (!customerId) throw new Error('reservation_not_found');
  const context = await getReservationCheckoutContext(reservationId, userId);
  if (!context) throw new Error('reservation_not_found');
  if (context.mode === 'gateway') throw new Error('payment_gateway_unavailable');
  if (context.quote.id !== input.quoteId || input.totalAmountCents !== context.quote.totalAmountCents) throw new Error('checkout_quote_changed');
  return checkoutRepository.start({ ...input, reservationId, customerId });
}

export async function confirmReservationDemoPix(
  reservationId: number,
  userId: string,
  input: Omit<CheckoutPixConfirmationInput, 'reservationId' | 'customerId' | 'method'>,
): Promise<Awaited<ReturnType<MysqlReservationCheckoutRepository['confirmDemoPix']>>> {
  const customerId = await findCustomerIdByAuthUserId(userId);
  if (!customerId) throw new Error('reservation_not_found');
  const context = await getReservationCheckoutContext(reservationId, userId);
  if (!context || context.quote.id !== input.quoteId || input.totalAmountCents !== context.quote.totalAmountCents) throw new Error('checkout_quote_changed');
  return checkoutRepository.confirmDemoPix({ ...input, reservationId, customerId, method: 'pix' });
}
