import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { createHash } from 'node:crypto';
import { getDatabasePool } from '@/server/db';
import { selectBestAvailableOption, type ReservationAllocationOption } from '../domain/reservation-allocation';
import { activeReservationOccupancySql } from './checkout-occupancy-sql';
import { checkoutEligibility, guaranteeIsActive } from '../domain/checkout-policy';
import type { CheckoutMethod, CheckoutPaymentResult } from '@/modules/payments/checkout/checkout-contract';

export type CheckoutStartInput = {
  reservationId: number;
  customerId: number;
  method: CheckoutMethod;
  quoteId: string;
  operationKey: string;
  totalAmountCents: number;
  pixTtlSeconds?: number;
};

export type CheckoutPixConfirmationInput = Omit<CheckoutStartInput, 'method' | 'pixTtlSeconds'> & { method: 'pix' };

type ReservationRow = RowDataPacket & {
  id: number;
  customerId: number;
  publicCode: string;
  status: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  checkoutMode: string | null;
  seatGuaranteeExpiresAt: Date | string | null;
  paymentDeadlineAt: Date | string | null;
};
type SessionRow = RowDataPacket & { state: string; method: CheckoutMethod | null; pixExpiresAt: Date | string | null };
type OperationRow = RowDataPacket & { requestFingerprint: string; resultJson: unknown };
type TableRow = RowDataPacket & { id: number; capacityMin: number; capacityMax: number; areaId: number };

function dateValue(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fingerprint(input: CheckoutStartInput): string {
  return createHash('sha256').update(JSON.stringify({
    reservationId: input.reservationId,
    method: input.method,
    quoteId: input.quoteId,
    totalAmountCents: input.totalAmountCents,
  })).digest('hex');
}

function parseStoredResult(value: unknown): CheckoutPaymentResult | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as CheckoutPaymentResult; } catch { return null; }
  }
  if (typeof value === 'object') return value as CheckoutPaymentResult;
  return null;
}

function isRetryable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error.code === 'ER_LOCK_DEADLOCK' || error.code === 'ER_LOCK_WAIT_TIMEOUT');
}

async function withTransaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      if (!isRetryable(error) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    } finally {
      connection.release();
    }
  }
  throw new Error('checkout_transaction_failed');
}

async function lockReservation(connection: PoolConnection, input: CheckoutStartInput): Promise<ReservationRow> {
  const [rows] = await connection.execute<ReservationRow[]>(
    `SELECT id, customer_id AS customerId, public_code AS publicCode, status,
            DATE_FORMAT(reservation_date, '%Y-%m-%d') AS reservationDate,
            TIME_FORMAT(start_time, '%H:%i') AS startTime,
            TIME_FORMAT(end_time, '%H:%i') AS endTime,
            guest_count AS guestCount, checkout_mode AS checkoutMode,
            seat_guarantee_expires_at AS seatGuaranteeExpiresAt,
            payment_deadline_at AS paymentDeadlineAt
     FROM reservations WHERE id = ? AND customer_id = ? LIMIT 1 FOR UPDATE`,
    [input.reservationId, input.customerId],
  );
  const reservation = rows[0];
  if (!reservation) throw new Error('reservation_not_found');
  return reservation;
}

async function lockSession(connection: PoolConnection, reservationId: number): Promise<SessionRow> {
  const [rows] = await connection.execute<SessionRow[]>(
    `SELECT state, method, pix_expires_at AS pixExpiresAt
     FROM reservation_checkout_sessions WHERE reservation_id = ? LIMIT 1 FOR UPDATE`,
    [reservationId],
  );
  if (!rows[0]) throw new Error('reservation_checkout_not_started');
  return rows[0];
}

async function readOperation(connection: PoolConnection, reservationId: number, operationKey: string): Promise<OperationRow | null> {
  const [rows] = await connection.execute<OperationRow[]>(
    `SELECT request_fingerprint AS requestFingerprint, result_json AS resultJson
     FROM reservation_checkout_operations
     WHERE reservation_id = ? AND operation_key = ? LIMIT 1 FOR UPDATE`,
    [reservationId, operationKey],
  );
  return rows[0] ?? null;
}

async function writeOperation(connection: PoolConnection, input: CheckoutStartInput, kind: 'start' | 'confirm_demo_pix', result: CheckoutPaymentResult): Promise<void> {
  await connection.execute(
    `INSERT INTO reservation_checkout_operations
      (reservation_id, operation_key, request_fingerprint, kind, result_json)
     VALUES (?, ?, ?, ?, ?)`,
    [input.reservationId, input.operationKey, fingerprint(input), kind, JSON.stringify(result)],
  );
}

async function lockActiveTables(connection: PoolConnection): Promise<TableRow[]> {
  const [rows] = await connection.execute<TableRow[]>(
    `SELECT t.id, t.capacity_min AS capacityMin, t.capacity_max AS capacityMax, t.area_id AS areaId
     FROM restaurant_tables t INNER JOIN dining_areas a ON a.id = t.area_id
     WHERE t.active = 1 AND a.active = 1 ORDER BY t.id FOR UPDATE`,
  );
  return rows.map((row) => ({ ...row, id: Number(row.id), capacityMin: Number(row.capacityMin), capacityMax: Number(row.capacityMax), areaId: Number(row.areaId) }));
}

async function readAllocation(connection: PoolConnection, reservationId: number): Promise<number[]> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT restaurant_table_id AS tableId FROM reservation_tables WHERE reservation_id = ? ORDER BY restaurant_table_id`,
    [reservationId],
  );
  return rows.map((row) => Number(row.tableId));
}

async function readUnavailableTableIds(connection: PoolConnection, reservation: ReservationRow): Promise<Set<number>> {
  const [occupied] = await connection.execute<RowDataPacket[]>(
    `SELECT DISTINCT rt.restaurant_table_id AS tableId
     FROM reservation_tables rt INNER JOIN reservations r ON r.id = rt.reservation_id
     WHERE r.id <> ? AND r.reservation_date = ?
       AND ${activeReservationOccupancySql}
       AND r.start_time < ? AND r.end_time > ?`,
    [reservation.id, reservation.reservationDate, reservation.endTime, reservation.startTime],
  );
  const [blocked] = await connection.execute<RowDataPacket[]>(
    `SELECT DISTINCT t.id AS tableId FROM restaurant_tables t
     LEFT JOIN blocked_periods bp ON bp.active = 1
       AND (bp.restaurant_table_id = t.id OR bp.dining_area_id = t.area_id OR (bp.restaurant_table_id IS NULL AND bp.dining_area_id IS NULL))
       AND bp.starts_at < ? AND bp.ends_at > ?
     WHERE bp.id IS NOT NULL`,
    [`${reservation.reservationDate} ${reservation.endTime}:00`, `${reservation.reservationDate} ${reservation.startTime}:00`],
  );
  return new Set([...occupied, ...blocked].map((row) => Number(row.tableId)));
}

async function chooseAllocation(connection: PoolConnection, reservation: ReservationRow, currentIds: number[], allowReallocation: boolean): Promise<number[]> {
  const tables = await lockActiveTables(connection);
  const unavailable = await readUnavailableTableIds(connection, reservation);
  const currentAvailable = currentIds.length > 0 && currentIds.every((id) => !unavailable.has(id));
  if (currentAvailable) return currentIds;
  if (!allowReallocation) throw new Error('reservation_capacity_unavailable');

  const options: ReservationAllocationOption[] = tables
    .filter((table) => !unavailable.has(table.id))
    .map((table) => ({ tableIds: [table.id], combinationId: null, capacityMin: table.capacityMin, capacityMax: table.capacityMax }));
  const selected = selectBestAvailableOption(options, Number(reservation.guestCount));
  if (!selected) throw new Error('reservation_capacity_unavailable');
  return selected.tableIds;
}

async function replaceAllocation(connection: PoolConnection, reservationId: number, tableIds: number[], currentIds: number[]): Promise<void> {
  if (tableIds.join(',') === currentIds.join(',')) return;
  await connection.execute('DELETE FROM reservation_tables WHERE reservation_id = ?', [reservationId]);
  for (const tableId of [...tableIds].sort((a, b) => a - b)) {
    await connection.execute('INSERT INTO reservation_tables (reservation_id, restaurant_table_id) VALUES (?, ?)', [reservationId, tableId]);
  }
}

async function completeReservation(connection: PoolConnection, reservation: ReservationRow, session: SessionRow, input: CheckoutStartInput, paidAt: Date): Promise<void> {
  const policy = {
    now: paidAt,
    checkoutStartedAt: null,
    seatGuaranteeExpiresAt: dateValue(reservation.seatGuaranteeExpiresAt),
    paymentDeadlineAt: dateValue(reservation.paymentDeadlineAt),
    status: reservation.status,
  };
  const eligibility = checkoutEligibility(policy);
  if (!eligibility.allowed) throw new Error(eligibility.reason);
  if (reservation.status === 'confirmed' || session.state === 'paid' || session.state === 'demo_completed') return;
  const currentIds = await readAllocation(connection, reservation.id);
  const tableIds = await chooseAllocation(connection, reservation, currentIds, !guaranteeIsActive(policy));
  await replaceAllocation(connection, reservation.id, tableIds, currentIds);
  await connection.execute(`UPDATE reservations SET status = 'confirmed' WHERE id = ? AND status = 'payment_pending'`, [reservation.id]);
  await connection.execute(`UPDATE reservation_checkout_sessions SET state = 'demo_completed', demo_completed_at = ?, version = version + 1 WHERE reservation_id = ?`, [paidAt, reservation.id]);
  await connection.execute(
    `INSERT INTO reservation_events (reservation_id, event_type, from_status, to_status, actor_type, event_key)
     VALUES (?, 'payment_demo_completed', 'payment_pending', 'confirmed', 'customer', ?)`,
    [reservation.id, `reservation:${reservation.id}:checkout-completed`],
  );
}

export class MysqlReservationCheckoutRepository {
  private replayedCheckoutResult(existing: OperationRow | null, input: CheckoutStartInput): CheckoutPaymentResult | null {
    if (!existing) return null;
    if (existing.requestFingerprint !== fingerprint(input)) throw new Error('checkout_idempotency_conflict');
    return parseStoredResult(existing.resultJson);
  }

  private isCompletedCheckout(reservation: ReservationRow, session: SessionRow): boolean {
    return session.state === 'paid' || session.state === 'demo_completed' || reservation.status === 'confirmed';
  }

  private completedCheckoutResult(reservation: ReservationRow, session: SessionRow, input: CheckoutStartInput): CheckoutPaymentResult {
    return { paymentId: `DEMO-${reservation.id}-completed`, reservationId: reservation.id, method: session.method ?? input.method, mode: 'demo', totalAmountCents: input.totalAmountCents, status: 'paid', paidAt: new Date().toISOString(), demonstrative: true };
  }

  async start(input: CheckoutStartInput): Promise<CheckoutPaymentResult> {
    // The transaction keeps the ownership lock, replay, deadline and demo branches together.
    return withTransaction(async (connection) => {
      const reservation = await lockReservation(connection, input);
      const session = await lockSession(connection, input.reservationId);
      const existing = await readOperation(connection, input.reservationId, input.operationKey);
      const replayed = this.replayedCheckoutResult(existing, input);
      if (replayed) return replayed;
      if (this.isCompletedCheckout(reservation, session)) return this.completedCheckoutResult(reservation, session, input);
      const paymentDeadline = dateValue(reservation.paymentDeadlineAt);
      if (!paymentDeadline || Date.now() >= paymentDeadline.getTime()) throw new Error('reservation_payment_deadline_passed');
      const paymentId = `DEMO-${reservation.id}-${input.operationKey.slice(0, 8)}`;
      if (input.method === 'pix') {
        const expiresAt = new Date(Date.now() + (input.pixTtlSeconds ?? 1800) * 1000);
        const result: CheckoutPaymentResult = { paymentId, reservationId: reservation.id, method: 'pix', mode: 'demo', totalAmountCents: input.totalAmountCents, status: 'pending', pix: { displayCode: `THEWINE-DEMO:${reservation.id}:${paymentId}:${input.totalAmountCents}`, qrValue: `THEWINE-DEMO:${reservation.id}:${paymentId}`, expiresAt: expiresAt.toISOString() } };
        await connection.execute(`UPDATE reservation_checkout_sessions SET method = 'pix', state = 'pix_pending', pix_expires_at = ?, version = version + 1 WHERE reservation_id = ?`, [expiresAt, reservation.id]);
        await writeOperation(connection, input, 'start', result);
        return result;
      }
      const paidAt = new Date();
      await completeReservation(connection, reservation, session, input, paidAt);
      const result: CheckoutPaymentResult = { paymentId, reservationId: reservation.id, method: input.method, mode: 'demo', totalAmountCents: input.totalAmountCents, status: 'paid', paidAt: paidAt.toISOString(), demonstrative: true };
      await writeOperation(connection, input, 'start', result);
      return result;
    });
  }

  async confirmDemoPix(input: CheckoutPixConfirmationInput): Promise<CheckoutPaymentResult> {
    return withTransaction(async (connection) => {
      const reservation = await lockReservation(connection, input);
      const session = await lockSession(connection, input.reservationId);
      const existing = await readOperation(connection, input.reservationId, input.operationKey);
      if (existing) {
        if (existing.requestFingerprint !== fingerprint(input)) throw new Error('checkout_idempotency_conflict');
        const stored = parseStoredResult(existing.resultJson);
        if (stored) return stored;
      }
      if (session.state !== 'pix_pending') throw new Error('checkout_pix_not_pending');
      const pixExpiresAt = dateValue(session.pixExpiresAt);
      if (!pixExpiresAt || Date.now() >= pixExpiresAt.getTime()) throw new Error('checkout_pix_expired');
      const paidAt = new Date();
      await completeReservation(connection, reservation, session, input, paidAt);
      const result: CheckoutPaymentResult = { paymentId: `DEMO-${reservation.id}-pix`, reservationId: reservation.id, method: 'pix', mode: 'demo', totalAmountCents: input.totalAmountCents, status: 'paid', paidAt: paidAt.toISOString(), demonstrative: true };
      await writeOperation(connection, input, 'confirm_demo_pix', result);
      return result;
    });
  }
}
