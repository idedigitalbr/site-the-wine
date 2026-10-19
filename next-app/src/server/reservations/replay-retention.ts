import 'server-only';
import { MysqlReservationRepository } from '@/modules/reservations/infrastructure/mysql-reservation-repository';

const cleanupIntervalMs = 60 * 60 * 1000;
const globalWithCleanup = globalThis as typeof globalThis & {
  __theWineReplayCleanupTimer?: ReturnType<typeof setInterval>;
};

async function purgeExpiredReplayPayloads(repository: MysqlReservationRepository): Promise<void> {
  try {
    const count = await repository.purgeExpiredReplayPayloads();
    if (count > 0) console.info(`Purged ${count} expired reservation replay payloads.`);
  } catch (error) {
    console.error('Expired reservation replay cleanup failed', error);
  }
}

export function startReservationReplayCleanup(): void {
  if (globalWithCleanup.__theWineReplayCleanupTimer) return;

  const repository = new MysqlReservationRepository();
  void purgeExpiredReplayPayloads(repository);
  const timer = setInterval(() => void purgeExpiredReplayPayloads(repository), cleanupIntervalMs);
  timer.unref();
  globalWithCleanup.__theWineReplayCleanupTimer = timer;
}
