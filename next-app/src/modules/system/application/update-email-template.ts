import type { SystemRepository, UpdateEmailTemplateInput } from './ports';

export async function updateEmailTemplate(
  input: UpdateEmailTemplateInput,
  dependencies: { system: SystemRepository },
): Promise<void> {
  await dependencies.system.updateEmailTemplate(input);
}

export async function restoreEmailTemplate(
  id: number,
  dependencies: { system: SystemRepository },
): Promise<void> {
  await dependencies.system.restoreEmailTemplate(id);
}
