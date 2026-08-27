const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export type ReservationWindow = {
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
};

function isCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.toISOString().startsWith(value);
}

function timeInMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function hasValidTimeWindow(input: ReservationWindow): boolean {
  if (!timePattern.test(input.startTime) || !timePattern.test(input.endTime)) return true;
  return timeInMinutes(input.startTime) < timeInMinutes(input.endTime);
}

function hasValidGuestCount(guestCount: number): boolean {
  return Number.isInteger(guestCount) && guestCount >= 1 && guestCount <= 20;
}

export function validateReservationWindow(input: ReservationWindow): string[] {
  const errors: string[] = [];

  if (!isCalendarDate(input.reservationDate)) errors.push('reservationDate');
  if (!timePattern.test(input.startTime)) errors.push('startTime');
  if (!timePattern.test(input.endTime)) errors.push('endTime');
  if (!hasValidTimeWindow(input)) errors.push('timeWindow');
  if (!hasValidGuestCount(input.guestCount)) errors.push('guestCount');

  return errors;
}

export function assertValidReservationWindow(input: ReservationWindow): void {
  const errors = validateReservationWindow(input);
  if (errors.length > 0) {
    throw new Error(`Invalid reservation window: ${errors.join(', ')}`);
  }
}
