import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadOriginModule(environment) {
  const source = readFileSync(new URL('../src/server/customer-auth/origin.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    process: { env: environment },
    URL,
    require(name) {
      if (name === 'server-only') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

test('customer auth trusts only the configured exact production origins', () => {
  const auth = loadOriginModule({
    BETTER_AUTH_URL: 'https://thewineexperience.com.br',
    PUBLIC_APP_URL: 'https://thewineexperience.com.br',
    CUSTOMER_AUTH_TRUSTED_ORIGINS: 'https://thewine.suporteide.digital, https://thewineexperience.com.br, https://www.thewineexperience.com.br',
  });
  const supportedHosts = [
    'https://thewine.suporteide.digital',
    'https://thewineexperience.com.br',
    'https://www.thewineexperience.com.br',
  ];

  for (const origin of supportedHosts) {
    assert.equal(auth.hasTrustedOrigin(new Request('https://thewine.suporteide.digital/api/auth', { headers: { origin } })), true);
  }
  assert.equal(auth.hasTrustedOrigin(new Request('https://thewine.suporteide.digital/api/auth', {
    headers: { origin: 'https://thewine.suporteide.digital.attacker.example' },
  })), false);
  assert.equal(auth.getTrustedCustomerAuthOrigins().length, 3);
});

test('proxy IP buckets require the explicit trusted-proxy setting', () => {
  const request = new Request('https://thewine.suporteide.digital/api/auth', {
    headers: { 'x-real-ip': '203.0.113.44' },
  });
  assert.equal(loadOriginModule({}).getClientIpBucket(request), 'untrusted-proxy');
  assert.equal(loadOriginModule({ CUSTOMER_AUTH_TRUST_PROXY_HEADERS: 'true' }).getClientIpBucket(request), '203.0.113.44');
});

test('production Compose requires auth secrets and explicitly lists trusted origins', () => {
  const compose = readFileSync(new URL('../../docker-compose.yml', import.meta.url), 'utf8');
  assert.match(compose, /BETTER_AUTH_SECRET:\s*\$\{BETTER_AUTH_SECRET:\?/);
  assert.match(compose, /CUSTOMER_CPF_LOOKUP_SECRET:\s*\$\{CUSTOMER_CPF_LOOKUP_SECRET:\?/);
  assert.match(compose, /CUSTOMER_AUTH_TRUST_PROXY_HEADERS:\s*\$\{CUSTOMER_AUTH_TRUST_PROXY_HEADERS:-true\}/);
  assert.match(compose, /CUSTOMER_AUTH_TRUSTED_ORIGINS:/);
  assert.match(compose, /thewine\.suporteide\.digital/);
  assert.match(compose, /thewineexperience\.com\.br/);
});
