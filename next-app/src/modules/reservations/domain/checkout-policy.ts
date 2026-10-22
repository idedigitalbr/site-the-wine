export const checkoutGuaranteeMinutes = 30;
export const checkoutPaymentGraceHours = 2;

export type CheckoutBlockReason =
  | 'reservation_payment_deadline_passed'
  | 'reservation_capacity_unavailable'
  | 'reservation_not_payable';

export type CheckoutEligibility =
  | { allowed: true; reason: null }
  | { allowed: false; reason: CheckoutBlockReason };

export type CheckoutPolicyInput = {
  now: Date;
  checkoutStartedAt: Date | null;
  seatGuaranteeExpiresAt: Date | null;
  paymentDeadlineAt: Date | null;
  status: string;
};

export function checkoutEligibility(input: CheckoutPolicyInput): CheckoutEligibility {
  if (!['payment_pending', 'pending', 'confirmed'].includes(input.status)) {
    return { allowed: false, reason: 'reservation_not_payable' };
  }
  if (input.status === 'confirmed') return { allowed: true, reason: null };
  if (input.paymentDeadlineAt && input.now.getTime() >= input.paymentDeadlineAt.getTime()) {
    return { allowed: false, reason: 'reservation_payment_deadline_passed' };
  }
  return { allowed: true, reason: null };
}

export function guaranteeIsActive(input: CheckoutPolicyInput): boolean {
  if (input.status !== 'payment_pending' || !input.seatGuaranteeExpiresAt) return false;
  if (input.paymentDeadlineAt && input.paymentDeadlineAt.getTime() <= input.seatGuaranteeExpiresAt.getTime()) {
    return input.now.getTime() < input.paymentDeadlineAt.getTime();
  }
  return input.now.getTime() < input.seatGuaranteeExpiresAt.getTime();
}

export function effectiveGuaranteeEndsAt(input: Pick<CheckoutPolicyInput, 'seatGuaranteeExpiresAt' | 'paymentDeadlineAt'>): Date | null {
  if (!input.seatGuaranteeExpiresAt) return null;
  if (!input.paymentDeadlineAt) return input.seatGuaranteeExpiresAt;
  return new Date(Math.min(input.seatGuaranteeExpiresAt.getTime(), input.paymentDeadlineAt.getTime()));
}

export function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
}

function localParts(value: Date, timeZone: string): Record<string, string> {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value).reduce<Record<string, string>>((parts, part) => {
    parts[part.type] = part.value;
    return parts;
  }, {});
}

/** Converts a restaurant-local civil date/time to a UTC instant without using the browser clock. */
export function reservationPaymentDeadlineAt(
  reservationDate: string,
  startTime: string,
  timeZone: string,
): Date {
  let candidate = new Date(`${reservationDate}T${startTime}:00.000Z`);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = localParts(candidate, timeZone);
    const represented = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    const offset = represented - candidate.getTime();
    candidate = new Date(Date.parse(`${reservationDate}T${startTime}:00.000Z`) - offset);
  }
  return addHours(candidate, checkoutPaymentGraceHours);
}
