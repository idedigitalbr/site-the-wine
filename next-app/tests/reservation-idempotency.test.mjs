import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), 'utf8');

test('reservation concurrency harness requires an explicit isolated target', () => {
  const source = read('next-app/scripts/test-reservation-concurrency.mjs');

  assert.match(source, /RESERVATION_TEST_DATABASE_NAME/);
  assert.match(source, /RESERVATION_TEST_BASE_URL/);
  assert.match(source, /RESERVATION_TEST_DATABASE_NAME.*required|missing.*RESERVATION_TEST_DATABASE_NAME/is);
  assert.match(source, /Origin:\s*baseUrl|trusted Origin/i);
  assert.doesNotMatch(source, /127\.0\.0\.1:3000/);
  assert.doesNotMatch(source, /DATABASE_NAME.*thewine/);
});

test('reservation operations use a stable submission key and replay retention metadata', () => {
  const migration = read('database/migrations/014_reservation_attempts_and_replay.sql');

  assert.match(migration, /operation_key VARCHAR\(160\)/i);
  assert.match(migration, /attempt_id_hash.*operation_key|operation_key.*attempt_id_hash/is);
  assert.match(migration, /reservation_id BIGINT UNSIGNED/i);
  assert.match(migration, /result_public_code/i);
  assert.match(migration, /replay_expires_at/i);
});
