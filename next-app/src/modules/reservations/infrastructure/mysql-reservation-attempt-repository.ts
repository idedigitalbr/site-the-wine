import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createHash } from 'node:crypto';
import { getDatabasePool } from '@/server/db';
import type {
  ReservationAttemptContext,
  ReservationAttemptSelection,
} from '../domain/reservation-attempt';
import type { ReservationAttemptRepository } from '../application/reservation-attempt-service';

type AttemptRow = RowDataPacket & {
  attemptId: string;
  attemptIdHash: string;
  flowIdHash: string;
  ownerUserId: string;
  ownerCustomerId: number;
  ownerSessionTokenHash: string;
  revision: number;
  state: ReservationAttemptContext['state'];
  selectedTableIds: string | null;
  holdExpiresAt: Date | string | null;
  reservationId: number | null;
  expiresAt: Date | string;
};

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function parseSelection(value: string | null): ReservationAttemptSelection | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as ReservationAttemptSelection;
  } catch {
    return null;
  }
}

function mapAttempt(row: AttemptRow): ReservationAttemptContext {
  return {
    attemptId: row.attemptId,
    flowId: row.flowIdHash,
    userId: row.ownerUserId,
    customerId: Number(row.ownerCustomerId),
    sessionTokenHash: row.ownerSessionTokenHash,
    revision: Number(row.revision),
    state: row.state,
    selection: parseSelection(row.selectedTableIds),
    holdExpiresAt: row.holdExpiresAt ? new Date(row.holdExpiresAt).getTime() : null,
    reservationId: row.reservationId,
    expiresAt: String(row.expiresAt),
  };
}

export class MysqlReservationAttemptRepository implements ReservationAttemptRepository {
  async findByFlowId(flowId: string): Promise<ReservationAttemptContext | null> {
    const [rows] = await getDatabasePool().execute<AttemptRow[]>(
      `SELECT attempt_id AS attemptId, attempt_id_hash AS attemptIdHash, flow_id_hash AS flowIdHash,
              owner_user_id AS ownerUserId, owner_customer_id AS ownerCustomerId,
              owner_session_token_hash AS ownerSessionTokenHash, revision, state,
              selected_table_ids AS selectedTableIds, hold_expires_at AS holdExpiresAt,
              reservation_id AS reservationId, expires_at AS expiresAt
       FROM reservation_attempts WHERE flow_id_hash = ? LIMIT 1`,
      [hash(flowId)],
    );
    return rows[0] ? mapAttempt(rows[0]) : null;
  }

  async create(input: {
    attemptId: string;
    flowId: string;
    userId: string;
    customerId: number;
    sessionTokenHash: string;
    expiresAt: string;
  }): Promise<ReservationAttemptContext> {
    const attemptIdHash = hash(input.attemptId);
    const flowIdHash = hash(input.flowId);
    try {
      await getDatabasePool().execute<ResultSetHeader>(
        `INSERT INTO reservation_attempts
          (flow_id_hash, attempt_id, attempt_id_hash, owner_user_id, owner_customer_id,
           owner_session_token_hash, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [flowIdHash, input.attemptId, attemptIdHash, input.userId, input.customerId, input.sessionTokenHash, input.expiresAt],
      );
    } catch (error) {
      if ((error as { code?: string }).code !== 'ER_DUP_ENTRY') throw error;
    }
    const created = await this.findByFlowId(input.flowId);
    if (!created) throw new Error('Reservation attempt could not be created');
    return { ...created, attemptId: input.attemptId, flowId: input.flowId };
  }

  async updateIfRevision(
    attemptId: string,
    expectedRevision: number,
    update: Partial<Pick<ReservationAttemptContext, 'revision' | 'selection' | 'state' | 'holdId' | 'holdExpiresAt' | 'reservationId'>>,
  ): Promise<ReservationAttemptContext | null> {
    const { fields, values } = buildAttemptUpdate(update);
    if (fields.length === 0) return null;
    values.push(hash(attemptId), expectedRevision);
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `UPDATE reservation_attempts SET ${fields.join(', ')} WHERE attempt_id_hash = ? AND revision = ?`,
      values,
    );
    if (result.affectedRows !== 1) return null;
    const [rows] = await getDatabasePool().execute<AttemptRow[]>(
      `SELECT attempt_id AS attemptId, attempt_id_hash AS attemptIdHash, flow_id_hash AS flowIdHash,
              owner_user_id AS ownerUserId, owner_customer_id AS ownerCustomerId,
              owner_session_token_hash AS ownerSessionTokenHash, revision, state,
              selected_table_ids AS selectedTableIds, hold_expires_at AS holdExpiresAt,
              reservation_id AS reservationId, expires_at AS expiresAt
       FROM reservation_attempts WHERE attempt_id_hash = ? LIMIT 1`,
      [hash(attemptId)],
    );
    return rows[0] ? { ...mapAttempt(rows[0]), attemptId } : null;
  }
}

function buildAttemptUpdate(
  update: Partial<Pick<ReservationAttemptContext, 'revision' | 'selection' | 'state' | 'holdId' | 'holdExpiresAt' | 'reservationId'>>,
): { fields: string[]; values: Array<string | number | Date | null> } {
  const fields: string[] = [];
  const values: Array<string | number | Date | null> = [];
  if (update.revision !== undefined) { fields.push('revision = ?'); values.push(update.revision); }
  if (update.selection !== undefined) { fields.push('selected_table_ids = ?'); values.push(update.selection ? JSON.stringify(update.selection) : null); }
  if (update.state !== undefined) { fields.push('state = ?'); values.push(update.state); }
  if (update.holdExpiresAt !== undefined) { fields.push('hold_expires_at = ?'); values.push(update.holdExpiresAt ? new Date(update.holdExpiresAt) : null); }
  if (update.reservationId !== undefined) { fields.push('reservation_id = ?'); values.push(update.reservationId); }
  return { fields, values };
}
