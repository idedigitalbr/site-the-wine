import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { loadCustomerReservationsModule } from '../tests/support/load-customer-reservations-module.mjs';

const env = process.env;
const database = env.CUSTOMER_RESERVATIONS_TEST_DATABASE;
const required = [
  'CUSTOMER_RESERVATIONS_TEST_HOST',
  'CUSTOMER_RESERVATIONS_TEST_PORT',
  'CUSTOMER_RESERVATIONS_TEST_USER',
  'CUSTOMER_RESERVATIONS_TEST_PASSWORD',
  'CUSTOMER_RESERVATIONS_TEST_DATABASE',
];

if (required.some((key) => !env[key])) {
  console.log('PENDING: SQL customer reservations integration requires the explicit CUSTOMER_RESERVATIONS_TEST_* variables.');
  process.exit(0);
}

if (!database || database.length > 64 || !/^thewine_test_customer_reservations_[a-z0-9_]+$/.test(database)) {
  throw new Error('CUSTOMER_RESERVATIONS_TEST_DATABASE must match the isolated test prefix and MySQL identifier rules.');
}

const connectionOptions = {
  host: env.CUSTOMER_RESERVATIONS_TEST_HOST,
  port: Number(env.CUSTOMER_RESERVATIONS_TEST_PORT),
  user: env.CUSTOMER_RESERVATIONS_TEST_USER,
  password: env.CUSTOMER_RESERVATIONS_TEST_PASSWORD,
};
const reservationStatus = loadCustomerReservationsModule(
  new URL('../src/modules/reservations/domain/reservation-status.ts', import.meta.url),
);
const adapterModule = loadCustomerReservationsModule(
  new URL('../src/modules/reservations/infrastructure/mysql-customer-reservation-query.ts', import.meta.url),
  {
    '@/server/db': { getDatabasePool: () => { throw new Error('The integration adapter must use its injected pool.'); } },
    '../domain/reservation-status': reservationStatus,
  },
);

let admin;
let pool;
let databaseCreated = false;

async function execute(connection, sql, params = []) {
  return connection.execute(sql, params);
}

async function main() {
  admin = await mysql.createConnection(connectionOptions);
  await execute(admin, `CREATE DATABASE \`${database}\``);
  databaseCreated = true;
  await execute(admin, `USE \`${database}\``);
  await execute(admin, `CREATE TABLE customers (
    id INT PRIMARY KEY,
    auth_user_id VARCHAR(191) NOT NULL UNIQUE
  )`);
  await execute(admin, `CREATE TABLE reservations (
    id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    reservation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    guest_count INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    notes VARCHAR(500) NULL
  )`);
  await execute(admin, `CREATE TABLE reservation_special_needs (
    reservation_id INT NOT NULL,
    need_code VARCHAR(64) NOT NULL
  )`);
  await execute(admin, 'INSERT INTO customers (id, auth_user_id) VALUES (11, ?), (22, ?)', ['user-a', 'user-b']);

  const rows = Array.from({ length: 21 }, (_, index) => [index + 1, 11, `2026-10-${String(23 + Math.floor(index / 3)).padStart(2, '0')}`, `${String(18 + (index % 4)).padStart(2, '0')}:00:00`, `${String(20 + (index % 4)).padStart(2, '0')}:00:00`, 2, 'confirmed', index === 0 ? null : `A ${index}`]);
  rows.push([100, 22, '2026-10-23', '20:00:00', '22:00:00', 4, 'pending', 'B only']);
  for (const row of rows) {
    await execute(admin, 'INSERT INTO reservations (id, customer_id, reservation_date, start_time, end_time, guest_count, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', row);
  }
  await execute(admin, 'INSERT INTO reservation_special_needs (reservation_id, need_code) VALUES (1, ?), (1, ?), (100, ?)', ['high_chair', 'dietary_restriction', 'food_allergy']);

  pool = mysql.createPool({ ...connectionOptions, database });
  const repository = new adapterModule.MysqlCustomerReservationQueryRepository(pool);
  const firstPage = await repository.listByCustomerId(11, { offset: 0, limit: 21 });
  assert.equal(firstPage.length, 21);
  assert.equal(firstPage[0].id, 1);
  assert.deepEqual(firstPage[0].specialNeeds, ['dietary_restriction', 'high_chair']);
  assert.equal(firstPage.every((row) => row.notes !== 'B only'), true);
  const secondPage = await repository.listByCustomerId(11, { offset: 20, limit: 21 });
  assert.equal(secondPage.length, 1);
  const otherAccount = await repository.listByCustomerId(22, { offset: 0, limit: 21 });
  assert.deepEqual(otherAccount.map((row) => row.id), [100]);
  console.log('PASS: SQL adapter isolation, ordering, pagination and preference mapping passed in the disposable schema.');
}

try {
  await main();
} finally {
  await pool?.end();
  await admin?.end();
  if (databaseCreated) {
    const cleanup = await mysql.createConnection(connectionOptions);
    try {
      await execute(cleanup, `DROP DATABASE \`${database}\``);
    } finally {
      await cleanup.end();
    }
  }
}
