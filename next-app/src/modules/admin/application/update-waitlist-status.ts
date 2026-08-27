import { assertWaitlistTransition, type WaitlistStatus } from '@/modules/reservations/domain/waitlist';
import type { AdminRepository } from './ports';

export type UpdateWaitlistStatusDependencies = { admin: AdminRepository };

export async function updateAdminWaitlistStatus(
  waitlistId: number,
  status: WaitlistStatus,
  dependencies: UpdateWaitlistStatusDependencies,
): Promise<void> {
  const currentStatus = await dependencies.admin.getWaitlistStatus(waitlistId);
  if (!currentStatus) throw new Error('Waitlist entry not found');
  assertWaitlistTransition(currentStatus, status);
  await dependencies.admin.updateWaitlistStatus(waitlistId, status);
}
