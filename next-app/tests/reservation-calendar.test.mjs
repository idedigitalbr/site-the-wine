import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCustomerReservationsModule } from './support/load-customer-reservations-module.mjs';

const calendar = loadCustomerReservationsModule(
  new URL('../src/lib/reservation-calendar.ts', import.meta.url),
);

function input(overrides = {}) {
  return {
    publicCode: 'TW-2026-14',
    reservationDate: '2026-10-14',
    startTime: '20:30',
    durationMinutes: 120,
    guestCount: 3,
    timeZone: 'America/Sao_Paulo',
    ...overrides,
  };
}

test('calendar event keeps reservation date, time, duration and timezone aligned', () => {
  const event = calendar.buildReservationCalendarEvent(input());
  assert.ok(event);
  assert.equal(event.startLocal, '2026-10-14T20:30:00');
  assert.equal(event.endLocal, '2026-10-14T22:30:00');
  assert.match(event.googleUrl, /dates=20261014T203000%2F20261014T223000/);
  assert.match(event.googleUrl, /ctz=America%2FSao_Paulo/);
  assert.match(event.ics, /DTSTART;TZID=America\/Sao_Paulo:20261014T203000/);
  assert.match(event.ics, /DTEND;TZID=America\/Sao_Paulo:20261014T223000/);
  assert.match(event.ics, /SUMMARY:Reserva/);
});

test('calendar event crosses the year boundary using the same duration', () => {
  const event = calendar.buildReservationCalendarEvent(input({ reservationDate: '2026-12-31', startTime: '23:30', durationMinutes: 120 }));
  assert.ok(event);
  assert.equal(event.endLocal, '2027-01-01T01:30:00');
  assert.match(event.ics, /DTEND;TZID=America\/Sao_Paulo:20270101T013000/);
});

test('calendar generation fails closed for missing duration, invalid timezone and invalid clock', () => {
  assert.equal(calendar.buildReservationCalendarEvent(input({ durationMinutes: null })), null);
  assert.equal(calendar.buildReservationCalendarEvent(input({ timeZone: 'Invalid/Zone' })), null);
  assert.equal(calendar.buildReservationCalendarEvent(input({ startTime: '25:00' })), null);
});

test('ICS folding respects UTF-8 byte limits without dropping accented content', () => {
  const event = calendar.buildReservationCalendarEvent(input({ publicCode: `TW-${'X'.repeat(100)}` }));
  const lines = event.ics.split('\r\n').filter(Boolean);
  const encoder = new TextEncoder();
  assert.ok(lines.some((line) => line.startsWith(' ')));
  assert.ok(lines.every((line) => encoder.encode(line).length <= 75));
  assert.match(event.ics, /SUMMARY:Reserva — The Wine/);
});
