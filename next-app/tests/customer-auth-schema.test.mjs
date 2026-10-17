import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const requireFromTest = createRequire(import.meta.url);
const ts = requireFromTest('typescript');
const moduleCache = new Map();

function loadTypeScript(relativePath) {
  const filename = isAbsolute(relativePath)
    ? relativePath
    : fileURLToPath(new URL(relativePath, import.meta.url));
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const loaded = { exports: {} };
  moduleCache.set(filename, loaded);
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      let dependency = resolve(dirname(filename), specifier);
      if (!extname(dependency)) dependency += '.ts';
      return loadTypeScript(dependency);
    }
    return requireFromTest(specifier);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

test('customer signup schema validates CPF, birth date, email confirmation, passwords and terms', () => {
  const { customerSignupSchema, normalizeRecoveryEmail } = loadTypeScript(
    '../src/modules/customer-auth/domain/customer-auth-schema.ts',
  );
  const input = {
    cpf: '52998224725',
    name: ' Ruy da Silva ',
    birthDate: '2000-02-29',
    recoveryEmail: ' Ruy@Example.com ',
    recoveryEmailConfirmation: 'ruy@example.com',
    password: 'senha que deve continuar literal ',
    passwordConfirmation: 'senha que deve continuar literal ',
    acceptWeakPassword: true,
    marketingConsent: false,
    acceptTerms: true,
  };

  const result = customerSignupSchema.safeParse(input);
  assert.equal(result.success, true, result.success ? '' : JSON.stringify(result.error.issues));
  assert.equal(result.data.name, 'Ruy da Silva');
  assert.equal(result.data.password, input.password);
  assert.equal(normalizeRecoveryEmail(input.recoveryEmail), 'ruy@example.com');

  assert.equal(customerSignupSchema.safeParse({ ...input, cpf: '11111111111' }).success, false);
  assert.equal(customerSignupSchema.safeParse({ ...input, birthDate: '2027-01-01' }).success, false);
  assert.equal(customerSignupSchema.safeParse({ ...input, recoveryEmailConfirmation: 'other@example.com' }).success, false);
  assert.equal(customerSignupSchema.safeParse({ ...input, passwordConfirmation: 'different' }).success, false);
  assert.equal(customerSignupSchema.safeParse({ ...input, acceptTerms: false }).success, false);
});
