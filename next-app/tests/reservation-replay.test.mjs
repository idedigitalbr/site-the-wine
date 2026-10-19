import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function load(relativePath) {
  const compiled = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: relativePath,
  });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
}

test('replay payload is authenticated and decryptable without storing plaintext', async () => {
  const { encryptReplayPayload, decryptReplayPayload } = await load('../src/server/reservations/replay-crypto.ts');
  const key = Buffer.alloc(32, 7);
  const encrypted = encryptReplayPayload({ publicCode: 'TW-1', secureToken: 'private-token' }, key, 'v1', new Date('2026-10-15T12:00:00.000Z'));

  assert.notEqual(encrypted.ciphertext, 'private-token');
  assert.deepEqual(decryptReplayPayload(encrypted, key, new Date('2026-10-15T12:00:00.000Z')), {
    publicCode: 'TW-1',
    secureToken: 'private-token',
  });
  assert.equal(encrypted.keyVersion, 'v1');
  assert.equal(encrypted.expiresAt, '2026-10-16T12:00:00.000Z');
});

test('replay crypto fails closed when configuration is missing or altered', async () => {
  const { configuredReplayKey, encryptReplayPayload, decryptReplayPayload } = await load('../src/server/reservations/replay-crypto.ts');

  assert.throws(() => configuredReplayKey({}), /replay encryption key/i);
  const key = Buffer.alloc(32, 3);
  const encrypted = encryptReplayPayload({ publicCode: 'TW-2' }, key, 'v1');
  assert.throws(() => decryptReplayPayload(encrypted, Buffer.alloc(32, 4)), /authentication|decrypt/i);
});

test('replay payloads are rejected at expiry and when the expiry timestamp is invalid', async () => {
  const { encryptReplayPayload, decryptReplayPayload } = await load('../src/server/reservations/replay-crypto.ts');
  const key = Buffer.alloc(32, 9);
  const now = new Date('2026-10-17T12:00:00.000Z');
  const encrypted = encryptReplayPayload({ secureToken: 'private-token' }, key, 'v1', new Date('2026-10-16T12:00:00.000Z'));

  assert.throws(
    () => decryptReplayPayload(encrypted, key, now),
    /replay expired/i,
  );
  assert.throws(
    () => decryptReplayPayload({ ...encrypted, expiresAt: 'not-a-date' }, key, now),
    /replay expired/i,
  );
});
