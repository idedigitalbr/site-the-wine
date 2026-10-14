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
  const { isWeakPassword, validatePasswordBasics } = await loadTypeScriptModule(
    '../src/modules/customer-auth/domain/password-policy.ts',
  );

  assert.equal(isWeakPassword('a-long-enough-password', 3), false);
  assert.equal(isWeakPassword('a-long-enough-password', 2), true);
  assert.equal(isWeakPassword('ShortPass!1', 4), true);
  assert.equal(validatePasswordBasics('  '), false);
  assert.equal(validatePasswordBasics('x'.repeat(128)), true);
  assert.equal(validatePasswordBasics('x'.repeat(129)), false);
});

test('birth date is a real calendar date and cannot be in the future', async () => {
  const { isValidBirthDate } = await loadTypeScriptModule('../src/modules/customer-auth/domain/birth-date.ts');

  assert.equal(isValidBirthDate('2000-02-29', '2026-10-13'), true);
  assert.equal(isValidBirthDate('2001-02-29', '2026-10-13'), false);
  assert.equal(isValidBirthDate('2026-10-14', '2026-10-13'), false);
  assert.equal(isValidBirthDate('2026-10-13', '2026-10-13'), true);
});
