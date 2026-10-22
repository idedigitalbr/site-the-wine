export type ReservationCalendarInput = {
  publicCode: string;
  reservationDate: string;
  startTime: string;
  durationMinutes: number | null;
  guestCount: number;
  timeZone: string;
};

export type ReservationCalendarEvent = {
  title: string;
  description: string;
  startLocal: string;
  endLocal: string;
  googleUrl: string;
  ics: string;
  filename: string;
};

type Parts = { year: number; month: number; day: number; hours: number; minutes: number };

function parseDate(value: string): Pick<Parts, 'year' | 'month' | 'day'> | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function parseTime(value: string): Pick<Parts, 'hours' | 'minutes'> | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function isValidParts(parts: Parts): boolean {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes));
  return date.getUTCFullYear() === parts.year
    && date.getUTCMonth() === parts.month - 1
    && date.getUTCDate() === parts.day
    && parts.hours <= 23
    && parts.minutes <= 59;
}

function parseInput(input: ReservationCalendarInput): Parts | null {
  const dateParts = parseDate(input.reservationDate);
  const timeParts = parseTime(input.startTime);
  const duration = input.durationMinutes;
  if (!dateParts || !timeParts || duration === null || !Number.isInteger(duration) || duration < 1) return null;
  const parts = {
    ...dateParts,
    ...timeParts,
  };
  if (!isValidParts(parts)) return null;
  return parts;
}

function endParts(start: Parts, durationMinutes: number): Parts {
  const end = new Date(Date.UTC(start.year, start.month - 1, start.day, start.hours, start.minutes + durationMinutes));
  return { year: end.getUTCFullYear(), month: end.getUTCMonth() + 1, day: end.getUTCDate(), hours: end.getUTCHours(), minutes: end.getUTCMinutes() };
}

function pad(value: number): string { return String(value).padStart(2, '0'); }
function localString(parts: Parts): string { return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hours)}:${pad(parts.minutes)}:00`; }
function compactString(parts: Parts): string { return `${parts.year}${pad(parts.month)}${pad(parts.day)}T${pad(parts.hours)}${pad(parts.minutes)}00`; }
function utcStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function foldIcsLine(line: string): string[] {
  const encoder = new TextEncoder();
  const result: string[] = [];
  let current = '';
  let limit = 75;
  for (const character of line) {
    if (current && encoder.encode(current).length + encoder.encode(character).length > limit) {
      result.push(current);
      current = ' ';
      limit = 75;
    }
    current += character;
  }
  if (current) result.push(current);
  return result;
}

function offsetFor(timeZone: string, parts: Parts): string {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes));
  const value = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT-03:00';
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(value);
  return match ? `${match[1]}${match[2]}${match[3]}` : '-0300';
}

function vTimezone(timeZone: string, start: Parts, end: Parts): string {
  const offsetFrom = offsetFor(timeZone, start);
  const offsetTo = offsetFor(timeZone, end);
  if (offsetFrom !== offsetTo) return '';
  return [
    'BEGIN:VTIMEZONE', `TZID:${escapeIcs(timeZone)}`, 'BEGIN:STANDARD',
    `DTSTART:${compactString(start)}`, `TZOFFSETFROM:${offsetFrom}`, `TZOFFSETTO:${offsetTo}`,
    'END:STANDARD', 'END:VTIMEZONE',
  ].join('\r\n');
}

function stableUid(input: ReservationCalendarInput): string {
  return `reservation-${input.publicCode.replace(/[^a-zA-Z0-9_-]/g, '-')}-${input.reservationDate}@thewine`;
}

export function buildReservationCalendarEvent(input: ReservationCalendarInput): ReservationCalendarEvent | null {
  const start = parseInput(input);
  if (!start || !input.timeZone) return null;
  let timeZone: string;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: input.timeZone }).format();
    timeZone = input.timeZone;
  } catch {
    return null;
  }
  const end = endParts(start, input.durationMinutes!);
  const title = 'Reserva — The Wine';
  const description = `Reserva no The Wine para ${input.guestCount} pessoa${input.guestCount === 1 ? '' : 's'}. Duração: ${input.durationMinutes} minutos.`;
  const vtz = vTimezone(timeZone, start, end);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Wine//Reservations//PT-BR', 'CALSCALE:GREGORIAN',
    ...(vtz ? vtz.split('\r\n') : []), 'BEGIN:VEVENT', `UID:${stableUid(input)}`,
    `DTSTAMP:${utcStamp()}`, `DTSTART;TZID=${escapeIcs(timeZone)}:${compactString(start)}`,
    `DTEND;TZID=${escapeIcs(timeZone)}:${compactString(end)}`, `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`, 'END:VEVENT', 'END:VCALENDAR',
  ].flatMap(foldIcsLine);
  const ics = `${lines.join('\r\n')}\r\n`;
  const google = new URL('https://calendar.google.com/calendar/render');
  google.searchParams.set('action', 'TEMPLATE');
  google.searchParams.set('text', title);
  google.searchParams.set('details', description);
  google.searchParams.set('dates', `${compactString(start)}/${compactString(end)}`);
  google.searchParams.set('ctz', timeZone);
  return { title, description, startLocal: localString(start), endLocal: localString(end), googleUrl: google.toString(), ics, filename: `reserva-${input.publicCode.replace(/[^a-zA-Z0-9_-]/g, '-')}.ics` };
}
