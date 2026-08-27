import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('production Compose runs idempotent migrations before the web service', () => {
  const compose = source('../docker-compose.yml');
  const dockerfile = source('../Dockerfile');

  assert.match(compose, /migrate:/);
  assert.match(compose, /service_completed_successfully/);
  assert.match(compose, /command: \["node", "\/app\/next-app\/scripts\/migrate-local\.mjs"\]/);
  assert.doesNotMatch(compose, /docker-entrypoint-initdb\.d/);
  assert.match(dockerfile, /scripts\/migrate-local\.mjs/);
  assert.match(dockerfile, /database\/migrations/);
});

test('production Compose passes protected runtime configuration to the web service', () => {
  const compose = source('../docker-compose.yml');

  for (const variable of [
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'ADMIN_SESSION_SECRET',
    'NOTIFICATION_JOB_SECRET',
  ]) {
    assert.match(compose, new RegExp(`${variable}: \\$\\{${variable}:\\?`));
  }
});

test('deploy workflow validates the pinned VPS host fingerprint and migration result', () => {
  const workflow = source('../.github/workflows/deploy-vps.yml');

  assert.match(workflow, /VPS_SSH_FINGERPRINT/);
  assert.match(workflow, /ssh-keygen -lf/);
  assert.match(workflow, /grep -Fxq/);
  assert.match(workflow, /docker compose config/);
  assert.match(workflow, /thewine-migrate/);
  assert.match(workflow, /MIGRATION_STATUS/);
});

test('operational migrations tolerate databases initialized by the legacy Compose flow', () => {
  const notificationsMigration = source('../database/migrations/006_add_notification_dedupe_key.sql');
  const operationsMigration = source('../database/migrations/007_add_reservation_operations.sql');

  assert.match(notificationsMigration, /information_schema\.columns/);
  assert.match(notificationsMigration, /information_schema\.statistics/);
  assert.match(operationsMigration, /information_schema\.columns/);
  assert.match(operationsMigration, /PREPARE/);
});
