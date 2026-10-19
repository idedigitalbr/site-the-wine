import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCustomerReservationsModule } from './support/load-customer-reservations-module.mjs';

const handlerModule = loadCustomerReservationsModule(
  new URL('../src/server/reservations/customer-reservations-handler.ts', import.meta.url),
);
const reservationStatusModule = loadCustomerReservationsModule(
  new URL('../src/modules/reservations/domain/reservation-status.ts', import.meta.url),
);
const adapterModule = loadCustomerReservationsModule(
  new URL('../src/modules/reservations/infrastructure/mysql-customer-reservation-query.ts', import.meta.url),
  {
    '@/server/db': { getDatabasePool: () => { throw new Error('real pool must not be requested'); } },
    '../domain/reservation-status': reservationStatusModule,
  },
);

function makeJson() {
  return (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

test('handler rejects anonymous, malformed and external identity parameters', async () => {
  const listed = [];
  const handler = handlerModule.createCustomerReservationsHandler({
    getSession: async () => null,
    list: async (...args) => { listed.push(args); return { reservations: [], nextOffset: null }; },
    json: makeJson(),
    reportError: () => {},
  });
  const response = await handler(new Request('http://local/api/reservations/my'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'unauthorized', message: 'Acesse sua conta para consultar suas reservas.' });
  assert.deepEqual(listed, []);

  const emptySession = handlerModule.createCustomerReservationsHandler({
    getSession: async () => ({ user: { id: '   ' } }),
    list: async (...args) => { listed.push(args); return { reservations: [], nextOffset: null }; },
    json: makeJson(),
    reportError: () => {},
  });
  assert.equal((await emptySession(new Request('http://local/api/reservations/my'))).status, 401);
  assert.deepEqual(listed, []);

  const bad = handlerModule.createCustomerReservationsHandler({
    getSession: async () => ({ user: { id: 'user-a' } }),
    list: async (...args) => { listed.push(args); return { reservations: [], nextOffset: null }; },
    json: makeJson(),
    reportError: () => {},
  });
  for (const query of ['?customerId=11', '?offset=1&offset=2', '?offset=', '?offset=-1', '?offset=1.5', '?offset=1e2', '?offset=9007199254740992']) {
    const result = await bad(new Request(`http://local/api/reservations/my${query}`));
    assert.equal(result.status, 400, query);
  }
  assert.deepEqual(listed, []);
});

test('handler passes only session identity and offset, and isolates failures', async () => {
  const calls = [];
  const handler = handlerModule.createCustomerReservationsHandler({
    getSession: async () => ({ user: { id: 'user-a' } }),
    list: async (...args) => { calls.push(args); return { reservations: [], nextOffset: null }; },
    json: makeJson(),
    reportError: () => {},
  });
  const response = await handler(new Request('http://local/api/reservations/my?offset=20'));
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [['user-a', 20]]);

  const errors = [];
  const failing = handlerModule.createCustomerReservationsHandler({
    getSession: async () => { throw new Error('private session detail'); },
    list: async () => ({ reservations: [], nextOffset: null }),
    json: makeJson(),
    reportError: (error) => errors.push(error),
  });
  const failed = await failing(new Request('http://local/api/reservations/my'));
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).error, 'reservations_unavailable');
  assert.equal(errors.length, 1);
});

test('real adapter uses customer binding, ordering and one query per page', async () => {
  const calls = [];
  const pool = { execute: async (sql, params) => {
    calls.push({ sql, params });
    return [[{
      id: '11', reservationDate: '2026-10-23', startTime: '20:00', endTime: '22:00', guestCount: '2', status: 'confirmed', notes: null, specialNeedsCsv: 'high_chair, dietary_restriction,none,',
    }], []];
  } };
  const repository = new adapterModule.MysqlCustomerReservationQueryRepository(pool);
  const rows = await repository.listByCustomerId(11, { offset: 0, limit: 21 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [11, 21, 0]);
  assert.match(calls[0].sql, /WHERE r\.customer_id = \?/);
  assert.match(calls[0].sql, /ORDER BY r\.reservation_date ASC, r\.start_time ASC, r\.id ASC/);
  assert.deepEqual(rows[0], { id: 11, reservationDate: '2026-10-23', startTime: '20:00', endTime: '22:00', guestCount: 2, status: 'confirmed', specialNeeds: ['high_chair', 'dietary_restriction'], notes: '' });
});
