import type { Pool, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '@/server/db';
import { calculateCustomerReservationDuration } from '../domain/customer-reservation-duration';

type QueryExecutor = Pick<Pool, 'execute'>;
export type ReservationCheckoutRecord = { id: number; publicCode: string; status: string; date: string; time: string; durationMinutes: number; guestCount: number; specialNeeds: string[] };
type ReservationCheckoutRow = RowDataPacket & { id: number | string; publicCode: string; status: string; date: string; time: string; endTime: string; guestCount: number | string; specialNeedsCsv: string | null };
export const reservationCheckoutSql = `SELECT r.id, r.public_code AS publicCode, r.status,
  DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS date,
  TIME_FORMAT(r.start_time, '%H:%i') AS time,
  TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
  r.guest_count AS guestCount,
  (SELECT GROUP_CONCAT(n.need_code ORDER BY n.need_code SEPARATOR ',')
   FROM reservation_special_needs n WHERE n.reservation_id = r.id) AS specialNeedsCsv
FROM reservations r
WHERE r.id = ? AND r.customer_id = ?
LIMIT 1`;
function mapRow(row: ReservationCheckoutRow): ReservationCheckoutRecord { const durationMinutes = calculateCustomerReservationDuration(row.time, row.endTime); if (!durationMinutes) throw new Error('Invalid reservation duration'); return { id: Number(row.id), publicCode: row.publicCode, status: row.status, date: row.date, time: row.time, durationMinutes, guestCount: Number(row.guestCount), specialNeeds: (row.specialNeedsCsv ?? '').split(',').map((value) => value.trim()).filter(Boolean) }; }
export class MysqlReservationCheckoutQuery { constructor(private readonly executor?: QueryExecutor) {} async findOwned(reservationId: number, customerId: number): Promise<ReservationCheckoutRecord | null> { if (!Number.isSafeInteger(reservationId) || reservationId < 1 || !Number.isSafeInteger(customerId) || customerId < 1) throw new Error('Invalid checkout owner'); const [rows] = await (this.executor ?? getDatabasePool()).execute<ReservationCheckoutRow[]>(reservationCheckoutSql, [reservationId, customerId]); return rows[0] ? mapRow(rows[0]) : null; } }
