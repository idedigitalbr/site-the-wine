import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), 'utf8');

test('reservation attempt migration is additive and owns one active attempt per flow', () => {
  const migration = read('database/migrations/014_reservation_attempts_and_replay.sql');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS reservation_attempts/i);
  assert.match(migration, /flow_id_hash CHAR\(64\)/i);
  assert.match(migration, /UNIQUE KEY .*flow.*\(flow_id_hash\)/i);
  assert.match(migration, /attempt_id_hash CHAR\(64\)/i);
  assert.match(migration, /owner_user_id VARCHAR\(36\)/i);
  assert.match(migration, /owner_customer_id BIGINT UNSIGNED/i);
  assert.match(migration, /revision INT UNSIGNED NOT NULL DEFAULT 0/i);
  assert.match(migration, /state VARCHAR\(24\)/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS reservation_operations/i);
  assert.match(migration, /UNIQUE KEY .*attempt.*operation/i);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/i);
});

test('reservation attempt migration stores only encrypted replay metadata', () => {
  const migration = read('database/migrations/014_reservation_attempts_and_replay.sql');

  assert.match(migration, /content_fingerprint CHAR\(64\)/i);
  assert.match(migration, /replay_ciphertext/i);
  assert.match(migration, /replay_nonce/i);
  assert.match(migration, /replay_auth_tag/i);
  assert.match(migration, /replay_key_version/i);
  assert.match(migration, /replay_expires_at/i);
  assert.match(migration, /notification_dedupe_key/i);
  assert.doesNotMatch(migration, /secure_token VARCHAR|plain.*token|raw_token/i);
});
