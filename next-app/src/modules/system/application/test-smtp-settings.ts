import type { SystemRepository } from './ports';

export async function testSmtpSettings(dependencies: { system: SystemRepository }): Promise<{ status: 'success'; message: string }> {
  const system = await dependencies.system.getSystem();
  if (!system.smtp.host || !system.smtp.fromEmail) {
    throw new Error('SMTP settings incomplete');
  }

  await dependencies.system.recordSmtpTest('success');
  return {
    status: 'success',
    message: 'Teste demonstrativo concluído. Nenhuma conexão SMTP real foi aberta.',
  };
}
