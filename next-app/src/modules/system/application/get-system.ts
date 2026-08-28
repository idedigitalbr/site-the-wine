import type { AdminSystem, SystemRepository } from './ports';

export async function getSystem(dependencies: { system: SystemRepository }): Promise<AdminSystem> {
  return dependencies.system.getSystem();
}
