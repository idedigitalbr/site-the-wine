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

test('parseRecoveryIdentifier validates CPF (with or without mask) and email addresses', () => {
  const { parseRecoveryIdentifier } = loadTypeScript(
    '../src/modules/customer-auth/domain/password-recovery.ts',
  );

  assert.deepEqual(parseRecoveryIdentifier('529.982.247-25'), {
    ok: true,
    kind: 'cpf',
    normalizedValue: '52998224725',
  });
  assert.deepEqual(parseRecoveryIdentifier('  Cliente@TheWine.com.br '), {
    ok: true,
    kind: 'email',
    normalizedValue: 'cliente@thewine.com.br',
  });
  assert.equal(parseRecoveryIdentifier('').ok, false);
  assert.equal(parseRecoveryIdentifier('111.111.111-11').ok, false);
  assert.equal(parseRecoveryIdentifier('invalido@').ok, false);
});

test('evaluateRecoveryPasswordRules and isRecoveryPasswordValid enforce the 4 password rules', () => {
  const {
    evaluateRecoveryPasswordRules,
    isRecoveryPasswordValid,
  } = loadTypeScript('../src/modules/customer-auth/domain/password-recovery.ts');

  assert.deepEqual(evaluateRecoveryPasswordRules('Abc12345'), {
    minLength: true,
    hasUppercase: true,
    hasLowercase: true,
    hasNumber: true,
  });
  assert.equal(isRecoveryPasswordValid('Abc12345'), true);
  assert.equal(isRecoveryPasswordValid('Abc1234'), false);
  assert.equal(isRecoveryPasswordValid('abc12345'), false);
  assert.equal(isRecoveryPasswordValid('ABC12345'), false);
  assert.equal(isRecoveryPasswordValid('Abcdefgh'), false);
});
