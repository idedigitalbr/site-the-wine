import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

test('confirmation binds replay expiry as a Date rather than an ISO SQL string', async () => {
  const source = readFileSync(new URL('../src/modules/reservations/infrastructure/mysql-reservation-repository.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let expiry;
  let paymentDeadline;
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    async execute(sql, values) {
      if (sql.includes('FROM reservation_attempts')) return [[{ ownerUserId: 'user', ownerCustomerId: 1, ownerSessionTokenHash: 'session', state: 'active', revision: 1 }]];
      if (sql.includes('FROM reservation_operations')) return [[]];
      if (sql.includes('replay_expires_at =')) { expiry = values[6]; return [{}]; }
      if (sql.includes('INSERT INTO reservations')) { paymentDeadline = values[15]; return [{ insertId: 123 }]; }
      if (sql.includes('FROM reservation_tables') || sql.includes('FROM blocked_periods') || sql.includes('FROM reservation_holds h')) return [[]];
      if (sql.includes('SELECT')) return [[{ id: 1, restaurant_table_id: 1 }]];
      return [{ affectedRows: 1 }];
    },
  };
  const exports = {};
  runInNewContext(compiled, {
    exports, Buffer, Date, Intl, process,
    require(name) {
      if (name === '@/server/db') return { getDatabasePool: () => ({ getConnection: async () => connection }) };
      if (name.endsWith('/domain/hold')) return { reservationHoldDurationMinutes: 8 };
      return require(name);
    },
  });
  await new exports.MysqlReservationRepository().confirmReservationAttempt({
    attemptId: 'attempt', expectedRevision: 1, operationKey: 'submit', contentFingerprint: 'fingerprint',
    ownerUserId: 'user', ownerCustomerId: 1, sessionTokenHash: 'session', tableIds: [1], specialNeeds: [], specialNeedsOther: '',
    reservation: { publicCode: 'test', customerId: 1, reservationDate: '2099-01-01', startTime: '19:00', endTime: '21:00', guestCount: 3, status: 'confirmed' },
    replay: { ciphertext: '', nonce: '', authTag: '', keyVersion: 'v1', expiresAt: '2026-10-17T19:31:50.608Z' },
    notificationDedupeKey: 'test',
  });
  assert.ok(expiry instanceof Date, 'SQL must receive a driver-serialized UTC Date');
  assert.equal(expiry.toISOString(), '2026-10-17T19:31:50.608Z');
  assert.equal(paymentDeadline, null);
});

test('checkout payment_pending grava prazo calculado no timezone do estabelecimento', async () => {
  const source = readFileSync(new URL('../src/modules/reservations/infrastructure/mysql-reservation-repository.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let paymentDeadline;
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    async execute(sql, values) {
      if (sql.includes('FROM reservation_attempts')) return [[{ ownerUserId: 'user', ownerCustomerId: 1, ownerSessionTokenHash: 'session', state: 'active', revision: 1 }]];
      if (sql.includes('FROM reservation_operations')) return [[]];
      if (sql.includes('INSERT INTO reservations')) { paymentDeadline = values[15]; return [{ insertId: 123 }]; }
      if (sql.includes('FROM reservation_tables') || sql.includes('FROM blocked_periods') || sql.includes('FROM reservation_holds h')) return [[]];
      if (sql.includes('SELECT')) return [[{ id: 1, restaurant_table_id: 1 }]];
      return [{ affectedRows: 1 }];
    },
  };
  const exports = {};
  const previousTimeZone = process.env.RESERVATION_ESTABLISHMENT_TIMEZONE;
  process.env.RESERVATION_ESTABLISHMENT_TIMEZONE = 'America/Sao_Paulo';
  try {
    runInNewContext(compiled, {
      exports, Buffer, Date, Intl, process,
      require(name) {
        if (name === '@/server/db') return { getDatabasePool: () => ({ getConnection: async () => connection }) };
        if (name.endsWith('/domain/hold')) return { reservationHoldDurationMinutes: 8 };
        return require(name);
      },
    });
    await new exports.MysqlReservationRepository().confirmReservationAttempt({
      attemptId: 'attempt', expectedRevision: 1, operationKey: 'submit', contentFingerprint: 'fingerprint',
      ownerUserId: 'user', ownerCustomerId: 1, sessionTokenHash: 'session', tableIds: [1], specialNeeds: [], specialNeedsOther: '',
      reservation: { publicCode: 'test', customerId: 1, reservationDate: '2026-10-23', startTime: '20:00', endTime: '22:00', guestCount: 3, status: 'payment_pending' },
      replay: { ciphertext: '', nonce: '', authTag: '', keyVersion: 'v1', expiresAt: '2026-10-17T19:31:50.608Z' },
      notificationDedupeKey: 'test',
    });
  } finally {
    if (previousTimeZone === undefined) delete process.env.RESERVATION_ESTABLISHMENT_TIMEZONE;
    else process.env.RESERVATION_ESTABLISHMENT_TIMEZONE = previousTimeZone;
  }
  assert.ok(paymentDeadline instanceof Date);
  assert.equal(paymentDeadline.toISOString(), '2026-10-24T01:00:00.000Z');
});
