import { getSystem } from '@/modules/system/application/get-system';
import { restoreEmailTemplate, updateEmailTemplate } from '@/modules/system/application/update-email-template';
import { saveSmtpSettings } from '@/modules/system/application/save-smtp-settings';
import { testSmtpSettings } from '@/modules/system/application/test-smtp-settings';
import type { SaveSmtpSettingsInput, UpdateEmailTemplateInput } from '@/modules/system/application/ports';
import { MysqlSystemRepository } from '@/modules/system/infrastructure/mysql-system-repository';

const systemRepository = new MysqlSystemRepository();

export function loadSystemConfiguration() {
  return getSystem({ system: systemRepository });
}

export function saveSystemSmtpSettings(input: SaveSmtpSettingsInput) {
  return saveSmtpSettings(input, { system: systemRepository });
}

export function testSystemSmtpSettings() {
  return testSmtpSettings({ system: systemRepository });
}

export function updateSystemEmailTemplate(input: UpdateEmailTemplateInput) {
  return updateEmailTemplate(input, { system: systemRepository });
}

export function restoreSystemEmailTemplate(id: number) {
  return restoreEmailTemplate(id, { system: systemRepository });
}
