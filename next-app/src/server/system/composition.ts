import { getSystem } from '@/modules/system/application/get-system';
import { restoreEmailTemplate, updateEmailTemplate } from '@/modules/system/application/update-email-template';
import { saveSmtpSettings } from '@/modules/system/application/save-smtp-settings';
import { savePublicReservationEnabled as savePublicReservationEnabledUseCase } from '@/modules/system/application/save-public-reservation-enabled';
import { saveReservationWhatsappNumber as saveReservationWhatsappNumberUseCase } from '@/modules/system/application/save-reservation-whatsapp-number';
import { testSmtpSettings } from '@/modules/system/application/test-smtp-settings';
import type { SaveSmtpSettingsInput, UpdateEmailTemplateInput } from '@/modules/system/application/ports';
import { MysqlSystemRepository } from '@/modules/system/infrastructure/mysql-system-repository';

const systemRepository = new MysqlSystemRepository();

export function loadSystemConfiguration() {
  return getSystem({ system: systemRepository });
}

export function getPublicReservationSettings() {
  return systemRepository.getPublicReservationSettings();
}

export function setPublicReservationEnabled(enabled: boolean) {
  return savePublicReservationEnabledUseCase(enabled, { system: systemRepository });
}

export function setPublicReservationWhatsappNumber(number: string) {
  return saveReservationWhatsappNumberUseCase(number, { system: systemRepository });
}

export function saveSystemSmtpSettings(input: SaveSmtpSettingsInput) {
  return saveSmtpSettings(input, { system: systemRepository });
}

export function testSystemSmtpSettings(recipientEmail: string) {
  return testSmtpSettings(recipientEmail, { system: systemRepository });
}

export function updateSystemEmailTemplate(input: UpdateEmailTemplateInput) {
  return updateEmailTemplate(input, { system: systemRepository });
}

export function restoreSystemEmailTemplate(id: number) {
  return restoreEmailTemplate(id, { system: systemRepository });
}
