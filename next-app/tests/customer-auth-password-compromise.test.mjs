import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function loadTypeScriptModule(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: relativePath,
  });
  const moduleSource = compiled.outputText.replace("import 'server-only';", '');
  return import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
}

test('compromise check sends only the SHA-1 prefix and detects the returned suffix', async () => {
  const { isCompromisedPassword } = await loadTypeScriptModule('../src/server/customer-auth/password-compromise.ts');
  const password = 'Senha segura 1!';
  const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  let requestedUrl = '';
  const result = await isCompromisedPassword(password, async (url) => {
    requestedUrl = url;
    return new Response(`${digest.slice(5)}:42\nOTHER:1`, { status: 200 });
  });
  assert.equal(result, true);
  assert.equal(requestedUrl.endsWith(digest.slice(0, 5)), true);
  assert.equal(requestedUrl.includes(digest.slice(5)), false);
});

test('compromise check fails closed when the external service is unavailable', async () => {
  const { isCompromisedPassword, PasswordCompromiseCheckUnavailable } = await loadTypeScriptModule('../src/server/customer-auth/password-compromise.ts');
  await assert.rejects(
    () => isCompromisedPassword('Senha segura 1!', async () => { throw new Error('network'); }),
    PasswordCompromiseCheckUnavailable,
  );
});
