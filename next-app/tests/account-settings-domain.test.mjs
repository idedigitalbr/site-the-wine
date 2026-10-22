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
    if (specifier === '@/modules/customer-auth/domain/password-policy') {
      return loadTypeScript('../src/modules/customer-auth/domain/password-policy.ts');
    }
    if (specifier === '@/modules/customer-auth/domain/password-strength') {
      return loadTypeScript('../src/modules/customer-auth/domain/password-strength.ts');
    }
    return requireFromTest(specifier);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

test('sanitizes profile text and validates names and email addresses', () => {
  const {
    sanitizeTextInput,
    sanitizeNameForSubmit,
    sanitizeEmailInput,
    updateProfileSchema,
  } = loadTypeScript('../src/modules/account-settings/domain/account-settings-schema.ts');

  assert.equal(sanitizeTextInput('  Ana\n\t  Wine\0  '), ' Ana Wine ');
  assert.equal(sanitizeNameForSubmit('  Ana\n\t  Wine\0  '), 'Ana Wine');
  assert.equal(sanitizeEmailInput('  ANA @Example.COM\n'), 'ana@example.com');
  assert.equal(updateProfileSchema.safeParse({ name: 'A', email: 'ana@example.com' }).success, false);
  assert.equal(updateProfileSchema.safeParse({ name: 'Ana Wine', email: 'ANA@EXAMPLE.COM' }).success, true);
  assert.equal(updateProfileSchema.safeParse({ name: 'Ana Wine', email: 'invalid' }).success, false);
  assert.equal(sanitizeEmailInput(`${'a'.repeat(300)}@x.com`).length, 254);
  assert.equal(updateProfileSchema.safeParse({ name: 'Ana Wine', email: `${'a'.repeat(300)}@x.com` }).success, false);
  assert.equal(sanitizeNameForSubmit('a'.repeat(161)).length, 160);
});

test('sanitizes and validates Brazilian WhatsApp numbers', () => {
  const {
    extractNationalPhoneDigits,
    formatWhatsAppPhoneInput,
    updateWhatsAppSchema,
  } = loadTypeScript('../src/modules/account-settings/domain/account-settings-schema.ts');

  assert.equal(extractNationalPhoneDigits('+55 91 98765-4321'), '91987654321');
  assert.equal(formatWhatsAppPhoneInput('91987654321'), '(91) 98765-4321');
  assert.equal(formatWhatsAppPhoneInput('9132224567'), '(91) 3222-4567');
  assert.equal(formatWhatsAppPhoneInput('91999999999999999999'), '(91) 99999-9999');
  assert.equal(updateWhatsAppSchema.safeParse({ phone: '91987654321' }).success, true);
  assert.equal(updateWhatsAppSchema.safeParse({ phone: '9132224567' }).success, true);
  assert.equal(updateWhatsAppSchema.safeParse({ phone: '91999999999' }).success, false);
  assert.equal(updateWhatsAppSchema.safeParse({ phone: '00000000000' }).success, false);
});

test('validates password changes with the domain policy', () => {
  const {
    sanitizePasswordInput,
    changePasswordSchema,
    validateNewPasswordStrength,
  } = loadTypeScript('../src/modules/account-settings/domain/account-settings-schema.ts');

  assert.equal(sanitizePasswordInput('secret\0value'), 'secretvalue');
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: 'current password 123',
    newPassword: 'short',
    confirmPassword: 'short',
  }).success, true);
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: 'current password 123',
    newPassword: 'new password 123456!',
    confirmPassword: 'different password 123456!',
  }).success, false);
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: 'same password 123456!',
    newPassword: 'same password 123456!',
    confirmPassword: 'same password 123456!',
  }).success, false);
  assert.equal(validateNewPasswordStrength('short', ['Ana Wine', 'ana@example.com']).valid, false);
  assert.equal(validateNewPasswordStrength('A secure wine password 2026!', ['Ana Wine', 'ana@example.com']).valid, true);
});
