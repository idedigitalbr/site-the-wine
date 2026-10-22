import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function loadTypeScriptModule(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
    fileName: relativePath,
  });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
}

test('CPF accepts valid digits, masks pasted text and rejects invalid/repeated digits', async () => {
  const { sanitizeCpfInput, isValidCpf } = await loadTypeScriptModule('../src/modules/customer-auth/domain/cpf.ts');

  assert.equal(sanitizeCpfInput('529.982.247-25'), '52998224725');
  assert.equal(sanitizeCpfInput('52998224725xyz'), '52998224725');
  assert.equal(sanitizeCpfInput('1'.repeat(12)), '1'.repeat(11));
  assert.equal(isValidCpf('52998224725'), true);
  assert.equal(isValidCpf('529.982.247-25'), false);
  assert.equal(isValidCpf('11111111111'), false);
  assert.equal(isValidCpf('52998224724'), false);
});

test('weak-password acknowledgement follows the documented length and zxcvbn thresholds', async () => {
  const { isWeakPassword, validateSignupPasswordBasics } = await loadTypeScriptModule(
    '../src/modules/customer-auth/domain/password-policy.ts',
  );

  assert.equal(isWeakPassword('a-long-password', 3), false);
  assert.equal(isWeakPassword('a-long-password', 2), true);
  assert.equal(isWeakPassword('Short!', 4), true);
  assert.equal(isWeakPassword('Senha123', 4), true);
  assert.equal(validateSignupPasswordBasics('  '), false);
  assert.equal(validateSignupPasswordBasics('x'.repeat(8)), true);
  assert.equal(validateSignupPasswordBasics('x'.repeat(20)), true);
  assert.equal(validateSignupPasswordBasics('x'.repeat(21)), false);
  assert.equal(validateSignupPasswordBasics('Senha forte 😀'), true);
});

test('name and email helpers normalize only the allowed frontend/server contract', async () => {
  const name = await loadTypeScriptModule('../src/modules/customer-auth/domain/name.ts');

  assert.equal(name.normalizeNameInput('  João   da Silva  '), 'João da Silva');
  assert.equal(name.isValidCustomerName('João da Silva'), true);
  assert.equal(name.isValidCustomerName('João\nSilva'), false);
  assert.equal(name.isValidCustomerName('João  Silva'), true);
});

test('birth date is a real calendar date and cannot be in the future', async () => {
  const { isValidBirthDate } = await loadTypeScriptModule('../src/modules/customer-auth/domain/birth-date.ts');

  assert.equal(isValidBirthDate('2000-02-29', '2026-10-13'), true);
  assert.equal(isValidBirthDate('2001-02-29', '2026-10-13'), false);
  assert.equal(isValidBirthDate('2026-10-14', '2026-10-13'), false);
  assert.equal(isValidBirthDate('2026-10-13', '2026-10-13'), true);
});
