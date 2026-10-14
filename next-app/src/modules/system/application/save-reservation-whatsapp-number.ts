import type { SystemRepository } from './ports';

export async function saveReservationWhatsappNumber(
  number: string,
  dependencies: { system: SystemRepository },
): Promise<void> {
  await dependencies.system.saveReservationWhatsappNumber(number);
}
