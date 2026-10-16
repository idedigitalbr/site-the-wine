export type ReservationServiceWindow = {
  startTime: string;
  endTime: string;
};

export type ReservationTimePolicyContext = {
  timezone: string;
  now?: Date;
  minimumLeadTimeMinutes?: number;
};

export type ReservationTimePolicyInput = {
  reservationDate: string;
  startTime: string;
  durationMinutes: number;
  serviceWindows: ReservationServiceWindow[];
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function timeInMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isCalendarDate(value: string): boolean {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.toISOString().startsWith(value);
}

function localDateTime(now: Date, timezone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function isInsideServiceWindow(startTime: string, endMinutes: number, windows: ReservationServiceWindow[]): boolean {
  const start = timeInMinutes(startTime);
  return windows.some((window) => {
    if (!timePattern.test(window.startTime) || !timePattern.test(window.endTime)) return false;
    const windowStart = timeInMinutes(window.startTime);
    const windowEnd = timeInMinutes(window.endTime);
    return start >= windowStart && endMinutes <= windowEnd;
  });
}

function assertBasicReservationTimeInput(input: ReservationTimePolicyInput): void {
  if (!isCalendarDate(input.reservationDate)) throw new Error('Invalid reservation time: invalid date');
  if (!timePattern.test(input.startTime)) throw new Error('Invalid reservation time: invalid time');
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 15 || input.durationMinutes > 720) {
    throw new Error('Invalid reservation time: invalid duration');
  }
}

function readCurrentLocalDateTime(context: ReservationTimePolicyContext): { date: string; time: string } {
  if (!context.timezone) throw new Error('Reservation timezone is not configured');
  try {
    return localDateTime(context.now ?? new Date(), context.timezone);
  } catch {
    throw new Error('Reservation timezone is not configured');
  }
}

function assertReservationNotPast(
  input: ReservationTimePolicyInput,
  current: { date: string; time: string },
  minimumLeadTimeMinutes: number,
): void {
  const startMinutes = timeInMinutes(input.startTime);
  if (input.reservationDate < current.date) throw new Error('Invalid reservation time: date is in the past');
  if (input.reservationDate === current.date && startMinutes < timeInMinutes(current.time) + minimumLeadTimeMinutes) {
    throw new Error('Invalid reservation time: time is in the past or below minimum lead time');
  }
}

export function assertReservationTimePolicy(
  input: ReservationTimePolicyInput,
  context: ReservationTimePolicyContext,
): void {
  assertBasicReservationTimeInput(input);
  const current = readCurrentLocalDateTime(context);
  const startMinutes = timeInMinutes(input.startTime);
  const endMinutes = startMinutes + input.durationMinutes;
  if (endMinutes > 24 * 60) throw new Error('Invalid reservation time: outside service window');
  assertReservationNotPast(input, current, context.minimumLeadTimeMinutes ?? 0);
  if (!isInsideServiceWindow(input.startTime, endMinutes, input.serviceWindows)) {
    throw new Error('Invalid reservation time: outside service window');
  }
}

export function reservationLocalDate(context: ReservationTimePolicyContext): string {
  return localDateTime(context.now ?? new Date(), context.timezone).date;
}
