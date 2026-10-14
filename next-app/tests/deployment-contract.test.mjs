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

test('deploy workflow pins the VPS and updates only the web and migration services', () => {
  const workflow = source('../.github/workflows/deploy-vps.yml');

  assert.match(workflow, /VPS_SSH_FINGERPRINT/);
  assert.match(workflow, /VPS_HOST: 179\.236\.75\.128/);
  assert.match(workflow, /runs-on: \[self-hosted, linux, x64, oracle-vps, docker\]/);
  assert.match(workflow, /Prepare writable deploy environment[\s\S]*?Checkout tested commit/);
  assert.match(workflow, /GIT_CONFIG_GLOBAL=%s/);
  assert.match(workflow, /ssh-keygen -lf/);
  assert.match(workflow, /MATCHED_HOSTS_FILE/);
  assert.match(workflow, /while IFS= read -r HOST_KEY_LINE/);
  assert.match(workflow, /awk '\{print \$2 " " \$3\}'/);
  assert.match(workflow, /LINE_FINGERPRINT.*VPS_SSH_FINGERPRINT/s);
  assert.match(workflow, /HOST_PATTERN="\$VPS_HOST"/);
  assert.match(workflow, /printf '%s %s\\n' "\$HOST_PATTERN" "\$KEY_MATERIAL"/);
  assert.match(workflow, /install -m 600 "\$MATCHED_HOSTS_FILE" ~\/\.ssh\/known_hosts/);
  assert.match(workflow, /UserKnownHostsFile=\$MATCHED_HOSTS_FILE/);
  assert.match(workflow, /HostKeyAlgorithms=\$PINNED_HOST_KEY_ALGORITHMS/);
  assert.match(workflow, /docker compose --project-name thewine --file "\$STACK_COMPOSE"/);
  assert.match(workflow, /build migrate web/);
  assert.match(workflow, /up -d --no-deps --force-recreate migrate/);
  assert.match(workflow, /up -d --no-deps --force-recreate web/);
  assert.match(workflow, /thewine-migrate/);
  assert.match(workflow, /MIGRATION_STATUS/);
  assert.match(workflow, /DB_CONTAINER_ID_AFTER/);
  assert.doesNotMatch(workflow, /--remove-orphans/);
});

test('operational migrations tolerate databases initialized by the legacy Compose flow', () => {
  const notificationsMigration = source('../database/migrations/006_add_notification_dedupe_key.sql');
  const operationsMigration = source('../database/migrations/007_add_reservation_operations.sql');

  assert.match(notificationsMigration, /information_schema\.columns/);
  assert.match(notificationsMigration, /information_schema\.statistics/);
  assert.match(operationsMigration, /information_schema\.columns/);
  assert.match(operationsMigration, /PREPARE/);
});
