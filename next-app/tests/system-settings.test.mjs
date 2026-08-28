import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('admin system module exposes protected SMTP and template routes', () => {
  assert.equal(existsSync(new URL('../src/app/admin/(protected)/sistema/page.tsx', import.meta.url)), true);
  assert.match(source('src/app/api/admin/system/route.ts'), /requireAdminSession/);
  assert.match(source('src/app/api/admin/system/smtp/route.ts'), /saveSmtpSettingsSchema/);
  assert.match(source('src/app/api/admin/system/smtp/test/route.ts'), /testSystemSmtpSettings/);
  assert.match(source('src/app/api/admin/system/templates/[id]/route.ts'), /updateEmailTemplateSchema/);
  assert.match(source('src/app/api/admin/system/templates/[id]/restore/route.ts'), /restoreSystemEmailTemplate/);
});

test('system configuration keeps SMTP passwords out of the response', () => {
  const migration = source('../database/migrations/008_create_system_settings_and_email_templates.sql');
  const repository = source('src/modules/system/infrastructure/mysql-system-repository.ts');
  const testRoute = source('src/app/api/admin/system/smtp/test/route.ts');
  const view = source('src/components/admin/AdminSystemView.tsx');

  assert.match(migration, /password_ciphertext TEXT/);
  assert.match(repository, /password_ciphertext IS NOT NULL AS passwordConfigured/);
  assert.doesNotMatch(repository, /password_ciphertext AS password/);
  assert.match(view, /senha atual está protegida/i);
  assert.match(testRoute, /testSmtpSettingsSchema/);
  assert.match(view, /Enviar e-mail de teste \(mock\)/);
  assert.match(view, /E-mail para teste/);
  assert.match(view, /recipientEmail/);
  assert.match(view, /incomplete_settings/);
  assert.match(view, /Preencha o servidor SMTP e o e-mail remetente acima/);
});

test('system module ships editable Portuguese templates with safe reset support', () => {
  const migration = source('../database/migrations/008_create_system_settings_and_email_templates.sql');
  const lineBreakMigration = source('../database/migrations/009_normalize_email_template_line_breaks.sql');
  const view = source('src/components/admin/AdminSystemView.tsx');
  const shell = source('src/components/admin/AdminShell.tsx');

  assert.match(migration, /system_email_templates/);
  assert.match(migration, /reservation_confirmation/);
  assert.match(migration, /waitlist_available/);
  assert.match(view, /Salvar modelo/);
  assert.match(view, /Restaurar padrão/);
  assert.match(view, /Prévia exata do e-mail/);
  assert.match(view, /logo_the_wine_branco_dourado_transparente\.webp/);
  assert.match(view, /bg-\[#070707\]/);
  assert.match(view, /split\('\\n'\)/);
  assert.match(lineBreakMigration, /CHAR\(10\)/);
  assert.match(shell, /logo_the_wine_branco_dourado_transparente\.webp/);
  assert.match(shell, /\/admin\/sistema/);
});
