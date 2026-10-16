import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

nextEnv.loadEnvConfig(process.cwd());
const database = `thewine_persistence_test_${Date.now()}`;
const connection = await mysql.createConnection({
  host: '127.0.0.1', port: Number(process.env.DATABASE_PORT ?? 3306),
  user: 'root', password: process.env.DATABASE_ADMIN_PASSWORD ?? '',
  multipleStatements: true, timezone: 'Z',
});
const migration = readFileSync(new URL('../../database/migrations/016_reconcile_reservation_hold_indexes.sql', import.meta.url), 'utf8');
let created = false;
try {
  await connection.query(`CREATE DATABASE ${mysql.escapeId(database)}`);
  created = true;
  await connection.changeUser({ database });
  await connection.query(`CREATE TABLE reservation_holds (
    id INT AUTO_INCREMENT PRIMARY KEY, session_token_hash CHAR(64) NOT NULL,
    attempt_id_hash CHAR(64), restaurant_table_id INT NOT NULL,
    UNIQUE KEY reservation_holds_session_table_uq (session_token_hash, restaurant_table_id),
    UNIQUE KEY reservation_holds_attempt_table_uq (attempt_id_hash, restaurant_table_id)
  ) ENGINE=InnoDB`);
  await connection.query("INSERT INTO reservation_holds (session_token_hash,attempt_id_hash,restaurant_table_id) VALUES ('session','attempt-1',1)");
  await connection.query(migration);
  await connection.query(migration);
  await connection.query("INSERT INTO reservation_holds (session_token_hash,attempt_id_hash,restaurant_table_id) VALUES ('session','attempt-2',1)");
  await assert.rejects(connection.query("INSERT INTO reservation_holds (session_token_hash,attempt_id_hash,restaurant_table_id) VALUES ('other','attempt-2',1)"), { code: 'ER_DUP_ENTRY' });
  const [holds] = await connection.query('SELECT COUNT(*) total FROM reservation_holds');
  assert.equal(holds[0].total, 2);
  await connection.query('CREATE TABLE replay_fixture (expiry DATETIME NOT NULL)');
  await connection.execute('INSERT INTO replay_fixture VALUES (?)', [new Date('2026-10-17T19:31:50.608Z')]);
  const [rows] = await connection.query('SELECT expiry FROM replay_fixture');
  assert.equal(rows[0].expiry.toISOString(), '2026-10-17T19:31:51.000Z');
  await connection.query('DROP TABLE reservation_holds');
  for (const table of ['reservation_holds', 'restaurant_tables', 'reservations', 'reservation_tables', 'reservation_special_needs', 'reservation_events', 'reservation_attempts', 'reservation_operations', 'blocked_periods']) {
    await connection.query(`CREATE TABLE ${mysql.escapeId(table)} LIKE thewine.${mysql.escapeId(table)}`);
  }
  await connection.query(migration);
  await connection.query("INSERT INTO restaurant_tables (id,code,name,area_id,table_type_id,capacity_min,capacity_max) VALUES (1,'fixture','Fixture',1,1,1,6)");
  const require = createRequire(import.meta.url);
  const ts = require('typescript');
  const source = readFileSync(new URL('../src/modules/reservations/infrastructure/mysql-reservation-repository.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const transactionConnection = {
    execute: (...args) => connection.execute(...args),
    beginTransaction: () => connection.beginTransaction(), commit: () => connection.commit(),
    rollback: () => connection.rollback(), release() {},
  };
  runInNewContext(compiled, {
    exports, Buffer, Date,
    require(name) {
      if (name === '@/server/db') return { getDatabasePool: () => ({ getConnection: async () => transactionConnection }) };
      if (name.endsWith('/domain/hold')) return { reservationHoldDurationMinutes: 8 };
      return require(name);
    },
  });
  const repository = new exports.MysqlReservationRepository();
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  for (const [attemptId, guestCount, reservationDate] of [['fixture-six', 6, '2099-01-01'], ['fixture-three', 3, '2099-01-02']]) {
    await connection.execute(`INSERT INTO reservation_attempts
      (flow_id_hash,attempt_id,attempt_id_hash,owner_user_id,owner_customer_id,owner_session_token_hash,expires_at)
      VALUES (?,?,?,?,?,?,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 1 DAY))`,
    [hash(attemptId + '-flow'), attemptId, hash(attemptId), 'fixture-user', 1, 'fixture-session']);
    await repository.createHoldForAttempt({
      attemptId, expectedRevision: 0, operationKey: 'fixture-hold', ownerUserId: 'fixture-user', ownerCustomerId: 1,
      sessionTokenHash: 'fixture-session', tableIds: [1], reservationDate, startTime: '19:00', endTime: '21:00', guestCount, durationMinutes: 120,
    });
    const input = {
      attemptId, expectedRevision: 1, operationKey: 'fixture-submit', contentFingerprint: hash(attemptId),
      ownerUserId: 'fixture-user', ownerCustomerId: 1, sessionTokenHash: 'fixture-session', tableIds: [1], specialNeeds: [], specialNeedsOther: '',
      reservation: { publicCode: attemptId, customerId: 1, reservationDate, startTime: '19:00', endTime: '21:00', guestCount, status: 'confirmed' },
      replay: { ciphertext: Buffer.from('fixture').toString('base64'), nonce: Buffer.alloc(12).toString('base64'), authTag: Buffer.alloc(16).toString('base64'), keyVersion: 'v1', expiresAt: '2099-01-03T19:31:50.608Z' },
      notificationDedupeKey: attemptId,
    };
    const createdResult = await repository.confirmReservationAttempt(input);
    assert.equal(createdResult.kind, 'created');
    const replay = await repository.confirmReservationAttempt(input);
    assert.equal(replay.kind, 'replay');
    assert.equal(replay.reservationId, createdResult.reservationId);
  }
  const [confirmed] = await connection.query('SELECT COUNT(*) total FROM reservations');
  assert.equal(confirmed[0].total, 2);
  console.log('Real repository passed: 6 and 3 guests confirmed, repeated submissions returned the same reservations.');
  console.log('MySQL integration passed: replay date, repeatable migration, row preservation, attempt uniqueness.');
} finally {
  if (created) await connection.query(`DROP DATABASE ${mysql.escapeId(database)}`);
  await connection.end();
}
