import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

nextEnv.loadEnvConfig(process.cwd());
const database = `thewine_persistence_test_${Date.now()}`;
const connection = await mysql.createConnection({
  host: process.env.DATABASE_HOST ?? '127.0.0.1',
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_ADMIN_USER ?? 'root',
  password: process.env.DATABASE_ADMIN_PASSWORD ?? '',
  multipleStatements: true, timezone: 'Z',
});
const migrationDirectory = new URL('../../database/migrations/', import.meta.url);
let created = false;
try {
  await connection.query(`CREATE DATABASE ${mysql.escapeId(database)}`);
  created = true;
  await connection.changeUser({ database });

  const migrations = readdirSync(migrationDirectory).filter((file) => file.endsWith('.sql')).sort();
  for (const file of migrations) {
    await connection.query(readFileSync(new URL(file, migrationDirectory), 'utf8'));
  }
  const holdIndexesMigration = readFileSync(
    new URL('016_reconcile_reservation_hold_indexes.sql', migrationDirectory),
    'utf8',
  );
  await connection.query(holdIndexesMigration);
  await connection.query(holdIndexesMigration);

  await connection.execute("INSERT INTO dining_areas (id, code, name) VALUES (1, 'fixture', 'Fixture')");
  await connection.execute("INSERT INTO table_types (id, code, name, capacity_min, capacity_max) VALUES (1, 'fixture', 'Fixture', 1, 6)");
  await connection.execute(`INSERT INTO restaurant_tables
    (id, code, name, area_id, table_type_id, capacity_min, capacity_max)
    VALUES (1, 'fixture', 'Fixture', 1, 1, 1, 6)`);
  await connection.execute(`INSERT INTO customers (id, name, phone, normalized_phone)
    VALUES (1, 'Integration Fixture', '+10000000000', '+10000000000')`);
  await connection.query('CREATE TABLE replay_fixture (expiry DATETIME NOT NULL)');
  await connection.execute('INSERT INTO replay_fixture VALUES (?)', [new Date('2026-10-17T19:31:50.608Z')]);
  const [rows] = await connection.query('SELECT expiry FROM replay_fixture');
  assert.equal(rows[0].expiry.toISOString(), '2026-10-17T19:31:51.000Z');
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
  const pool = {
    getConnection: async () => transactionConnection,
    execute: (...args) => connection.execute(...args),
  };
  runInNewContext(compiled, {
    exports, Buffer, Date,
    require(name) {
      if (name === '@/server/db') return { getDatabasePool: () => pool };
      if (name.endsWith('/domain/hold')) return { reservationHoldDurationMinutes: 8 };
      return require(name);
    },
  });
  const repository = new exports.MysqlReservationRepository();
  const hash = (value) => createHash('sha256').update(value).digest('hex');
  async function createAttempt(attemptId) {
    await connection.execute(`INSERT INTO reservation_attempts
      (flow_id_hash,attempt_id,attempt_id_hash,owner_user_id,owner_customer_id,owner_session_token_hash,expires_at)
      VALUES (?,?,?,?,?,?,DATE_ADD(CURRENT_TIMESTAMP,INTERVAL 1 DAY))`,
    [hash(attemptId + '-flow'), attemptId, hash(attemptId), 'fixture-user', 1, 'fixture-session']);
  }
  for (const [attemptId, guestCount, reservationDate] of [['fixture-six', 6, '2099-01-01'], ['fixture-three', 3, '2099-01-02']]) {
    await createAttempt(attemptId);
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

  for (const attemptId of ['overlap-first', 'overlap-second']) await createAttempt(attemptId);
  const overlapHold = {
    expectedRevision: 0, operationKey: 'fixture-hold', ownerUserId: 'fixture-user', ownerCustomerId: 1,
    sessionTokenHash: 'fixture-session', tableIds: [1], reservationDate: '2099-01-03', startTime: '19:00',
    endTime: '21:00', guestCount: 3, durationMinutes: 120,
  };
  await repository.createHoldForAttempt({ ...overlapHold, attemptId: 'overlap-first' });
  await assert.rejects(
    repository.createHoldForAttempt({ ...overlapHold, attemptId: 'overlap-second' }),
    /temporarily held/,
  );
  const [overlapRows] = await connection.execute(
    `SELECT COUNT(*) total FROM reservation_holds
     WHERE session_token_hash = ? AND reservation_starts_at = ? AND restaurant_table_id = ?`,
    ['fixture-session', '2099-01-03 19:00:00', 1],
  );
  assert.equal(Number(overlapRows[0].total), 1, 'same-session attempts must not hold the same table and time twice');

  const expiredAttemptId = 'expired-replay';
  await createAttempt(expiredAttemptId);
  await repository.createHoldForAttempt({ ...overlapHold, attemptId: expiredAttemptId, reservationDate: '2099-01-04' });
  const expiredInput = {
    attemptId: expiredAttemptId, expectedRevision: 1, operationKey: 'expired-submit', contentFingerprint: hash(expiredAttemptId),
    ownerUserId: 'fixture-user', ownerCustomerId: 1, sessionTokenHash: 'fixture-session', tableIds: [1], specialNeeds: [], specialNeedsOther: '',
    reservation: { publicCode: expiredAttemptId, customerId: 1, reservationDate: '2099-01-04', startTime: '19:00', endTime: '21:00', guestCount: 3, status: 'confirmed' },
    replay: { ciphertext: Buffer.from('expired-fixture').toString('base64'), nonce: Buffer.alloc(12).toString('base64'), authTag: Buffer.alloc(16).toString('base64'), keyVersion: 'v1', expiresAt: '2000-01-01T00:00:00.000Z' },
    notificationDedupeKey: expiredAttemptId,
  };
  const expiredCreated = await repository.confirmReservationAttempt(expiredInput);
  assert.equal(expiredCreated.kind, 'created');
  assert.equal(await repository.purgeExpiredReplayPayloads(), 1);
  const [expiredPayload] = await connection.execute(
    'SELECT replay_ciphertext, replay_nonce, replay_auth_tag, replay_key_version FROM reservation_operations WHERE attempt_id_hash = ? AND operation_key = ?',
    [hash(expiredAttemptId), expiredInput.operationKey],
  );
  assert.equal(expiredPayload[0].replay_ciphertext, null, 'expired ciphertext must be purged');
  assert.equal(expiredPayload[0].replay_nonce, null, 'expired nonce must be purged');
  await assert.rejects(repository.confirmReservationAttempt(expiredInput), /reservation_replay_expired/);

  const [confirmed] = await connection.query('SELECT COUNT(*) total FROM reservations');
  assert.equal(Number(confirmed[0].total), 3);
  console.log('MySQL integration passed: migrations, idempotent replay, same-session hold isolation, replay expiry, and ciphertext retention cleanup.');
} finally {
  if (created) await connection.query(`DROP DATABASE ${mysql.escapeId(database)}`);
  await connection.end();
}
