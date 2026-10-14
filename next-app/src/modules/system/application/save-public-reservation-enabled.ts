import type { SystemRepository } from './ports';

export async function savePublicReservationEnabled(
  enabled: boolean,
  dependencies: { system: SystemRepository },
): Promise<void> {
  await dependencies.system.savePublicReservationEnabled(enabled);
}
