import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCustomerReservationsModule } from './support/load-customer-reservations-module.mjs';

const duration = loadCustomerReservationsModule(
  new URL('../src/modules/reservations/domain/customer-reservation-duration.ts', import.meta.url),
);
const formatters = loadCustomerReservationsModule(
  new URL('../src/components/account/reservations-list/reservationCardFormatters.ts', import.meta.url),
);
const application = loadCustomerReservationsModule(
  new URL('../src/modules/reservations/application/list-customer-reservations.ts', import.meta.url),
);

test('calculates valid customer reservation durations and rejects invalid clocks', () => {
  assert.equal(duration.calculateCustomerReservationDuration('20:00', '22:00'), 120);
  assert.equal(duration.calculateCustomerReservationDuration('21:00', '22:30'), 90);
  assert.equal(duration.calculateCustomerReservationDuration('20:00', '20:01'), 1);
  for (const pair of [['bad', '22:00'], ['25:00', '22:00'], ['20:99', '22:00'], ['20:00', '20:00'], ['21:00', '20:00']]) {
    assert.equal(duration.calculateCustomerReservationDuration(pair[0], pair[1]), null);
  }
});

test('formats calendar dates in Portuguese without browser timezone normalization', () => {
  assert.equal(formatters.formatReservationDate('2026-10-23'), '23 de outubro de 2026');
  assert.equal(formatters.formatReservationDate('2026-02-31'), 'Data não informada');
  assert.equal(formatters.formatReservationDate('2026-13-01'), 'Data não informada');
  assert.equal(formatters.formatReservationDate('2024-02-29'), '29 de fevereiro de 2024');
  assert.equal(formatters.formatReservationDate('invalid'), 'Data não informada');
});

test('formats duration, people, preferences and notes according to the card contract', () => {
  assert.equal(formatters.formatReservationDuration(120), '120 minutos');
  assert.equal(formatters.formatReservationDuration(1), '1 minuto');
  assert.equal(formatters.formatReservationDuration(null), 'Duração não informada');
  assert.equal(formatters.formatGuestCount(1), '1 pessoa');
  assert.equal(formatters.formatGuestCount(2), '2 pessoas');
  assert.equal(formatters.formatSpecialNeeds(['other', 'high_chair', 'dietary_restriction']), 'Restrição alimentar, Cadeira infantil, Outra necessidade');
  assert.equal(formatters.formatSpecialNeeds(['none', 'unknown', 'unknown']), 'Preferência não identificada');
  assert.equal(formatters.formatSpecialNeeds([]), 'Nenhuma preferência informada');
  assert.equal(formatters.formatReservationNotes('  Frieira no pé  '), 'Frieira no pé');
  assert.equal(formatters.formatReservationNotes(''), 'Sem observações adicionais');
});

test('resolves account identity before querying and paginates 20 visible records', async () => {
  const calls = [];
  const records = Array.from({ length: 21 }, (_, index) => ({
    id: index + 1,
    reservationDate: '2026-10-23',
    startTime: '20:00',
    endTime: '22:00',
    guestCount: 2,
    status: 'confirmed',
    specialNeeds: [],
    notes: '',
  }));
  const response = await application.listCustomerReservations('user-a', 0, {
    findCustomerIdByAuthUserId: async (userId) => userId === 'user-a' ? 11 : 22,
    reservations: { listByCustomerId: async (customerId, page) => { calls.push({ customerId, page }); return records; } },
    calculateDuration: duration.calculateCustomerReservationDuration,
  });
  assert.equal(response.reservations.length, 20);
  assert.equal(response.nextOffset, 20);
  assert.deepEqual(calls, [{ customerId: 11, page: { offset: 0, limit: 21 } }]);

  const emptyCalls = [];
  const empty = await application.listCustomerReservations('missing', 20, {
    findCustomerIdByAuthUserId: async () => null,
    reservations: { listByCustomerId: async (...args) => { emptyCalls.push(args); return []; } },
    calculateDuration: duration.calculateCustomerReservationDuration,
  });
  assert.deepEqual(empty, { reservations: [], nextOffset: null });
  assert.deepEqual(emptyCalls, []);
});


test('formats structured ticket date parts and compact mobile metrics deterministically', () => {
  assert.deepEqual(formatters.formatReservationTicketDate('2026-10-14'), {
    isValid: true,
    day: '14',
    monthYearLine1: 'de outubro',
    monthYearLine2: 'de 2026',
    weekdayLong: 'QUARTA-FEIRA',
    monthShort: 'OUT',
    year: '2026',
    weekdayShort: 'Qua',
    fullLabel: '14 de outubro de 2026',
  });
  assert.equal(formatters.formatReservationTicketDate('2026-02-31').isValid, false);
  assert.equal(formatters.formatReservationTicketDate('2026-02-31').day, '--');
  assert.deepEqual(formatters.formatCompactDurationParts(120), { primary: '120', unit: 'min' });
  assert.deepEqual(formatters.formatCompactDurationParts(null), { primary: 'Não inf.', unit: null });
  assert.deepEqual(formatters.formatCompactGuestParts(1), { count: '1', unit: 'pessoa' });
  assert.deepEqual(formatters.formatCompactGuestParts(7), { count: '7', unit: 'pessoas' });
});

test('detects when a reservation is expired after 6 hours from start time', () => {
  const reservationDate = '2026-10-20';
  const startTime = '20:00';

  // 20/10/2026 às 21:00 (1h após início) -> não expirou
  const oneHourLater = new Date('2026-10-20T21:00:00-03:00').getTime();
  assert.equal(formatters.isReservationExpired(reservationDate, startTime, oneHourLater), false);

  // 21/10/2026 às 01:59:59 (5h59m após início) -> não expirou
  const justBeforeSixHours = new Date('2026-10-21T01:59:59-03:00').getTime();
  assert.equal(formatters.isReservationExpired(reservationDate, startTime, justBeforeSixHours), false);

  // 21/10/2026 às 02:00:00 (exatamente 6h após início) -> expirou
  const exactlySixHours = new Date('2026-10-21T02:00:00-03:00').getTime();
  assert.equal(formatters.isReservationExpired(reservationDate, startTime, exactlySixHours), true);

  // 21/10/2026 às 03:00:00 (7h após início) -> expirou
  const sevenHoursLater = new Date('2026-10-21T03:00:00-03:00').getTime();
  assert.equal(formatters.isReservationExpired(reservationDate, startTime, sevenHoursLater), true);
});
