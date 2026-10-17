import { randomBytes } from 'node:crypto';
import { createReservationAttemptService } from '@/modules/reservations/application/reservation-attempt-service';
import { MysqlReservationAttemptRepository } from '@/modules/reservations/infrastructure/mysql-reservation-attempt-repository';

const repository = new MysqlReservationAttemptRepository();
const service = createReservationAttemptService(repository, () => randomBytes(32).toString('base64url'));

export function getOrCreateReservationAttempt(input: {
  flowId: string;
  userId: string;
  customerId: number;
  sessionTokenHash: string;
  expiresAt: Date;
}) {
  return service.getOrCreate({ ...input, expiresAt: input.expiresAt.toISOString().slice(0, 19).replace('T', ' ') });
}
