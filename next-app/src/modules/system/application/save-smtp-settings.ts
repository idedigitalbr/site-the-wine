import type { SaveSmtpSettingsInput, SystemRepository } from './ports';

export async function saveSmtpSettings(
  input: SaveSmtpSettingsInput,
  dependencies: { system: SystemRepository },
): Promise<void> {
  await dependencies.system.saveSmtpSettings(input);
}
