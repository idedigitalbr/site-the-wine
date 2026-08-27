import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { getDatabasePool } from '@/server/db';
import type {
  ConfirmReservationWithHoldInput,
  CreatedReservationHold,
  PortalReservation,
  ReservationNotificationContact,
  ReservationId,
  ReservationPortalRepository,
  ReservationRepository,
} from '../application/ports';
import { reservationHoldDurationMinutes, type ReservationHoldSelection } from '../domain/hold';
import type { ReservationDraft } from '../domain/reservation';
import type { ReservationStatus } from '../domain/reservation-status';

type TableRow = RowDataPacket & { id: number };
type HoldResultRow = RowDataPacket & { holdId: number; expiresAt: number };
type PortalReservationRow = RowDataPacket & {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: string;
  customerName: string;
  tableLabel: string | null;
};
type NotificationContactRow = RowDataPacket & { email: string | null };

async function insertReservationEvent(
  connection: PoolConnection,
  reservationId: number,
  eventType: string,
  fromStatus: ReservationStatus | null,
  toStatus: ReservationStatus | null,
  actorType: string,
  eventKey: string,
): Promise<void> {
  await connection.execute(
    `INSERT INTO reservation_events
      (reservation_id, event_type, from_status, to_status, actor_type, event_key)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [reservationId, eventType, fromStatus, toStatus, actorType, eventKey],
  );
}

function mapPortalReservation(row: PortalReservationRow): PortalReservation {
  return {
    id: Number(row.id),
    publicCode: row.publicCode,
    reservationDate: row.reservationDate,
    startTime: row.startTime,
    endTime: row.endTime,
    guestCount: Number(row.guestCount),
    status: row.status as ReservationStatus,
    customerName: row.customerName,
    tableLabel: row.tableLabel,
  };
}

const portalReservationSelect = `SELECT
  r.id,
  r.public_code AS publicCode,
  DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
  TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
  TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
  r.guest_count AS guestCount,
  r.status,
  c.name AS customerName,
  GROUP_CONCAT(DISTINCT CONCAT(t.code, ' · ', t.name) ORDER BY t.id SEPARATOR ', ') AS tableLabel
FROM reservations r
INNER JOIN customers c ON c.id = r.customer_id
LEFT JOIN reservation_tables rt ON rt.reservation_id = r.id
LEFT JOIN restaurant_tables t ON t.id = rt.restaurant_table_id`;

function placeholders(ids: number[]): string {
  return ids.map(() => '?').join(', ');
}

function orderedTableIds(tableIds: number[]): number[] {
  return [...tableIds].sort((first, second) => first - second);
}

function isRetryableTransactionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  return error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT';
}

async function withTransaction<T>(operation: (connection: PoolConnection) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();
      const result = await operation(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      if (!isRetryableTransactionError(error) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    } finally {
      connection.release();
    }
  }
  throw new Error('Reservation transaction could not be completed');
}

function reservationWindow(input: { reservationDate: string; startTime: string; endTime: string }) {
  return {
    startsAt: `${input.reservationDate} ${input.startTime}:00`,
    endsAt: `${input.reservationDate} ${input.endTime}:00`,
  };
}

async function removeExpiredHolds(connection: PoolConnection): Promise<void> {
  await connection.execute('DELETE FROM reservation_holds WHERE expires_at <= CURRENT_TIMESTAMP');
}

async function lockActiveTables(connection: PoolConnection, tableIds: number[]): Promise<void> {
  const ids = orderedTableIds(tableIds);
  const [rows] = await connection.execute<TableRow[]>(
    `SELECT id FROM restaurant_tables
     WHERE id IN (${placeholders(ids)}) AND active = 1
     ORDER BY id FOR UPDATE`,
    ids,
  );
  if (rows.length !== ids.length) {
    throw new Error('Reservation unavailable: selected tables are inactive');
  }
}

async function assertNoReservationConflict(
  connection: PoolConnection,
  input: ConfirmReservationWithHoldInput,
): Promise<void> {
  const ids = orderedTableIds(input.tableIds);
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT rt.restaurant_table_id AS tableId
     FROM reservation_tables rt
     INNER JOIN reservations r ON r.id = rt.reservation_id
     WHERE rt.restaurant_table_id IN (${placeholders(ids)})
       AND r.reservation_date = ?
       AND r.status IN ('hold', 'payment_pending', 'pending', 'confirmed', 'seated')
       AND r.start_time < ? AND r.end_time > ?
     FOR UPDATE`,
    [...ids, input.reservation.reservationDate, input.reservation.endTime, input.reservation.startTime],
  );
  if (rows.length > 0) throw new Error('Reservation unavailable: selected tables are already reserved');
}

async function assertNoBlockedConflict(
  connection: PoolConnection,
  tableIds: number[],
  startsAt: string,
  endsAt: string,
): Promise<void> {
  const ids = orderedTableIds(tableIds);
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT bp.id
     FROM blocked_periods bp
     WHERE bp.active = 1
       AND (
         bp.restaurant_table_id IN (${placeholders(ids)})
         OR bp.dining_area_id IN (
           SELECT area_id FROM restaurant_tables WHERE id IN (${placeholders(ids)})
         )
         OR (bp.restaurant_table_id IS NULL AND bp.dining_area_id IS NULL)
       )
       AND bp.starts_at < ? AND bp.ends_at > ?
     LIMIT 1`,
    [...ids, ...ids, endsAt, startsAt],
  );
  if (rows.length > 0) throw new Error('Reservation unavailable: selected tables are blocked');
}

async function assertNoHoldConflict(
  connection: PoolConnection,
  tableIds: number[],
  startsAt: string,
  endsAt: string,
  sessionTokenHash: string,
): Promise<void> {
  const ids = orderedTableIds(tableIds);
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT h.restaurant_table_id AS tableId
     FROM reservation_holds h
     WHERE h.restaurant_table_id IN (${placeholders(ids)})
       AND h.expires_at > CURRENT_TIMESTAMP
       AND h.reservation_starts_at IS NOT NULL
       AND h.reservation_ends_at IS NOT NULL
       AND h.reservation_starts_at < ? AND h.reservation_ends_at > ?
       AND h.session_token_hash <> ?
     LIMIT 1 FOR UPDATE`,
    [...ids, endsAt, startsAt, sessionTokenHash],
  );
  if (rows.length > 0) throw new Error('Reservation unavailable: selected tables are temporarily held');
}

async function assertNoConflicts(
  connection: PoolConnection,
  input: ConfirmReservationWithHoldInput,
): Promise<void> {
  const window = reservationWindow(input.reservation);
  await assertNoReservationConflict(connection, input);
  await assertNoBlockedConflict(connection, input.tableIds, window.startsAt, window.endsAt);
  await assertNoHoldConflict(connection, input.tableIds, window.startsAt, window.endsAt, input.sessionTokenHash);
}

async function insertReservation(connection: PoolConnection, input: ReservationDraft): Promise<number> {
  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO reservations
      (public_code, customer_id, experience_id, reservation_date,
       start_time, end_time, guest_count, status, preferred_table_type_id,
       source, notes, internal_notes, confirmation_token_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.publicCode,
      input.customerId,
      input.experienceId ?? null,
      input.reservationDate,
      input.startTime,
      input.endTime,
      input.guestCount,
      input.status,
      input.preferredTableTypeId ?? null,
      input.source ?? 'website',
      input.notes ?? null,
      input.internalNotes ?? null,
      input.confirmationTokenHash ?? null,
    ],
  );
  return result.insertId;
}

async function insertTableAssignments(
  connection: PoolConnection,
  reservationId: number,
  tableIds: number[],
): Promise<void> {
  for (const tableId of orderedTableIds(tableIds)) {
    await connection.execute(
      `INSERT INTO reservation_tables (reservation_id, restaurant_table_id)
       VALUES (?, ?)`,
      [reservationId, tableId],
    );
  }
}

async function insertSpecialNeeds(
  connection: PoolConnection,
  reservationId: number,
  needs: string[],
  details: string,
): Promise<void> {
  for (const needCode of needs) {
    await connection.execute(
      `INSERT INTO reservation_special_needs (reservation_id, need_code, details)
       VALUES (?, ?, ?)`,
      [reservationId, needCode, needCode === 'other' ? details : null],
    );
  }
}

async function readCreatedHold(
  connection: PoolConnection,
  sessionTokenHash: string,
  tableIds: number[],
): Promise<CreatedReservationHold> {
  const ids = orderedTableIds(tableIds);
  const [rows] = await connection.execute<HoldResultRow[]>(
    `SELECT MIN(id) AS holdId, UNIX_TIMESTAMP(MAX(expires_at)) * 1000 AS expiresAt
     FROM reservation_holds
     WHERE session_token_hash = ? AND restaurant_table_id IN (${placeholders(ids)})
       AND expires_at > CURRENT_TIMESTAMP`,
    [sessionTokenHash, ...ids],
  );
  const row = rows[0];
  if (!row || !row.holdId || !row.expiresAt) throw new Error('Reservation hold could not be created');
  return { holdId: Number(row.holdId), tableIds: ids, expiresAt: Number(row.expiresAt) };
}

export class MysqlReservationRepository implements ReservationRepository, ReservationPortalRepository {
  private async findPortalReservationBy(
    column: 'confirmation_token_hash' | 'public_code',
    value: string,
  ): Promise<PortalReservation | null> {
    const [rows] = await getDatabasePool().execute<PortalReservationRow[]>(
      `${portalReservationSelect}
       WHERE r.${column} = ?
       GROUP BY r.id, c.id
       LIMIT 1`,
      [value],
    );
    return rows[0] ? mapPortalReservation(rows[0]) : null;
  }

  async findByConfirmationTokenHash(tokenHash: string): Promise<PortalReservation | null> {
    return this.findPortalReservationBy('confirmation_token_hash', tokenHash);
  }

  async findByPublicCode(publicCode: string): Promise<PortalReservation | null> {
    return this.findPortalReservationBy('public_code', publicCode);
  }

  async findNotificationContactByConfirmationTokenHash(tokenHash: string): Promise<ReservationNotificationContact | null> {
    const [rows] = await getDatabasePool().execute<NotificationContactRow[]>(
      `SELECT c.email
       FROM reservations r
       INNER JOIN customers c ON c.id = r.customer_id
       WHERE r.confirmation_token_hash = ?
       LIMIT 1`,
      [tokenHash],
    );
    return rows[0] ? { email: rows[0].email } : null;
  }

  async cancel(id: ReservationId): Promise<void> {
    await withTransaction(async (connection) => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT status FROM reservations WHERE id = ? LIMIT 1 FOR UPDATE',
        [id],
      );
      const fromStatus = rows[0]?.status as ReservationStatus | undefined;
      if (!fromStatus || !['hold', 'payment_pending', 'pending', 'confirmed'].includes(fromStatus)) {
        throw new Error('Reservation can no longer be cancelled');
      }
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE reservations
         SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND status IN ('hold', 'payment_pending', 'pending', 'confirmed')`,
        [id],
      );
      if (result.affectedRows !== 1) throw new Error('Reservation can no longer be cancelled');
      await insertReservationEvent(connection, id, 'cancelled', fromStatus, 'cancelled', 'customer', `reservation:${id}:cancelled`);
    });
  }

  async create(input: ReservationDraft): Promise<number> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO reservations
        (public_code, customer_id, experience_id, reservation_date,
         start_time, end_time, guest_count, status, preferred_table_type_id,
         source, notes, internal_notes, confirmation_token_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.publicCode,
        input.customerId,
        input.experienceId ?? null,
        input.reservationDate,
        input.startTime,
        input.endTime,
        input.guestCount,
        input.status,
        input.preferredTableTypeId ?? null,
        input.source ?? 'website',
        input.notes ?? null,
        input.internalNotes ?? null,
        input.confirmationTokenHash ?? null,
      ],
    );
    return result.insertId;
  }

  async assignTables(reservationId: ReservationId, tableIds: number[]): Promise<void> {
    await Promise.all(tableIds.map((tableId) => getDatabasePool().execute(
      `INSERT INTO reservation_tables (reservation_id, restaurant_table_id)
       VALUES (?, ?)`,
      [reservationId, tableId],
    )));
  }

  async addSpecialNeeds(
    reservationId: ReservationId,
    needs: string[],
    details: string,
  ): Promise<void> {
    if (needs.length === 0) return;
    await Promise.all(needs.map((needCode) => getDatabasePool().execute(
      `INSERT INTO reservation_special_needs (reservation_id, need_code, details)
       VALUES (?, ?, ?)`,
      [reservationId, needCode, needCode === 'other' ? details : null],
    )));
  }

  async createHold(input: ReservationHoldSelection): Promise<CreatedReservationHold> {
    return withTransaction(async (connection) => {
      await removeExpiredHolds(connection);
      await lockActiveTables(connection, input.tableIds);
      await connection.execute('DELETE FROM reservation_holds WHERE session_token_hash = ?', [input.sessionTokenHash]);
      const validationInput: ConfirmReservationWithHoldInput = {
        reservation: {
          publicCode: 'hold-validation',
          customerId: 1,
          reservationDate: input.reservationDate,
          startTime: input.startTime,
          endTime: input.endTime,
          guestCount: input.guestCount,
          status: 'draft',
        },
        tableIds: input.tableIds,
        sessionTokenHash: input.sessionTokenHash,
        specialNeeds: [],
        specialNeedsOther: '',
      };
      await assertNoConflicts(connection, validationInput);
      const window = reservationWindow(input);
      for (const tableId of orderedTableIds(input.tableIds)) {
        await connection.execute(
          `INSERT INTO reservation_holds
            (session_token_hash, restaurant_table_id, starts_at, expires_at,
             reservation_starts_at, reservation_ends_at, guest_count)
           VALUES (?, ?, CURRENT_TIMESTAMP,
             DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ${reservationHoldDurationMinutes} MINUTE), ?, ?, ?)`,
          [input.sessionTokenHash, tableId, window.startsAt, window.endsAt, input.guestCount],
        );
      }
      const result = await readCreatedHold(connection, input.sessionTokenHash, input.tableIds);
      return result;
    });
  }

  async confirmWithHold(input: ConfirmReservationWithHoldInput): Promise<ReservationId> {
    return withTransaction(async (connection) => {
      await removeExpiredHolds(connection);
      await lockActiveTables(connection, input.tableIds);
      const ids = orderedTableIds(input.tableIds);
      const window = reservationWindow(input.reservation);
      const [holds] = await connection.execute<RowDataPacket[]>(
        `SELECT restaurant_table_id
         FROM reservation_holds
         WHERE session_token_hash = ?
           AND restaurant_table_id IN (${placeholders(ids)})
           AND reservation_starts_at = ? AND reservation_ends_at = ?
           AND guest_count = ? AND expires_at > CURRENT_TIMESTAMP
         FOR UPDATE`,
        [input.sessionTokenHash, ...ids, window.startsAt, window.endsAt, input.reservation.guestCount],
      );
      if (holds.length !== ids.length) {
        throw new Error('Reservation unavailable: reservation hold expired');
      }
      await assertNoConflicts(connection, input);
      const reservationId = await insertReservation(connection, input.reservation);
      await insertTableAssignments(connection, reservationId, ids);
      await insertSpecialNeeds(connection, reservationId, input.specialNeeds, input.specialNeedsOther);
      await insertReservationEvent(connection, reservationId, 'created', null, 'confirmed', 'customer', `reservation:${reservationId}:created`);
      await connection.execute(
        `DELETE FROM reservation_holds
         WHERE session_token_hash = ? AND restaurant_table_id IN (${placeholders(ids)})`,
         [input.sessionTokenHash, ...ids],
      );
      return reservationId;
    });
  }
}
