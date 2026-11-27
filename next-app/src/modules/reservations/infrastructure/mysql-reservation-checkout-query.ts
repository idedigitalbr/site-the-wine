import type { Pool, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '@/server/db';
import { calculateCustomerReservationDuration } from '../domain/customer-reservation-duration';

type QueryExecutor = Pick<Pool, 'execute'>;
export type ReservationCheckoutRecord = {
  id: number; publicCode: string; status: string; date: string; time: string; durationMinutes: number; guestCount: number; specialNeeds: string[];
  serverNow: string; checkoutStartedAt: string | null; seatGuaranteeExpiresAt: string | null; paymentDeadlineAt: string | null;
  checkoutMode: 'demo' | 'live' | null; checkoutProgress: 'pending' | 'pix_pending' | 'demo_completed' | 'paid' | null;
  checkoutMethod: 'pix' | 'credit' | 'debit' | null; pixExpiresAt: string | null; lastPaymentId: string | null; pixDisplayCode: string | null; pixQrValue: string | null; paidAt: string | null;
};
type ReservationCheckoutRow = RowDataPacket & {
  id: number | string; publicCode: string; status: string; date: string; time: string; endTime: string; guestCount: number | string; specialNeedsCsv: string | null;
  serverNow: Date | string; checkoutStartedAt: Date | string | null; seatGuaranteeExpiresAt: Date | string | null; paymentDeadlineAt: Date | string | null;
  checkoutMode: string | null; checkoutProgress: string | null; checkoutMethod: string | null; pixExpiresAt: Date | string | null;
  lastPaymentId: string | null; pixDisplayCode: string | null; pixQrValue: string | null; paidAt: Date | string | null;
};
export const reservationCheckoutSql = `SELECT r.id, r.public_code AS publicCode, r.status,
  DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS date,
  TIME_FORMAT(r.start_time, '%H:%i') AS time,
  TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
  r.guest_count AS guestCount,
  (SELECT GROUP_CONCAT(n.need_code ORDER BY n.need_code SEPARATOR ',')
   FROM reservation_special_needs n WHERE n.reservation_id = r.id) AS specialNeedsCsv,
  UTC_TIMESTAMP(3) AS serverNow,
  DATE_FORMAT(r.checkout_started_at, '%Y-%m-%dT%H:%i:%s.000Z') AS checkoutStartedAt,
  DATE_FORMAT(r.seat_guarantee_expires_at, '%Y-%m-%dT%H:%i:%s.000Z') AS seatGuaranteeExpiresAt,
  DATE_FORMAT(r.payment_deadline_at, '%Y-%m-%dT%H:%i:%s.000Z') AS paymentDeadlineAt,
  r.checkout_mode AS checkoutMode,
  s.state AS checkoutProgress,
  s.method AS checkoutMethod,
  DATE_FORMAT(s.pix_expires_at, '%Y-%m-%dT%H:%i:%s.000Z') AS pixExpiresAt
  ,JSON_UNQUOTE(JSON_EXTRACT((SELECT o.result_json FROM reservation_checkout_operations o WHERE o.reservation_id = r.id ORDER BY o.id DESC LIMIT 1), '$.paymentId')) AS lastPaymentId
  ,JSON_UNQUOTE(JSON_EXTRACT((SELECT o.result_json FROM reservation_checkout_operations o WHERE o.reservation_id = r.id ORDER BY o.id DESC LIMIT 1), '$.pix.displayCode')) AS pixDisplayCode
  ,JSON_UNQUOTE(JSON_EXTRACT((SELECT o.result_json FROM reservation_checkout_operations o WHERE o.reservation_id = r.id ORDER BY o.id DESC LIMIT 1), '$.pix.qrValue')) AS pixQrValue
  ,JSON_UNQUOTE(JSON_EXTRACT((SELECT o.result_json FROM reservation_checkout_operations o WHERE o.reservation_id = r.id ORDER BY o.id DESC LIMIT 1), '$.paidAt')) AS paidAt
FROM reservations r
LEFT JOIN reservation_checkout_sessions s ON s.reservation_id = r.id
WHERE r.id = ? AND r.customer_id = ?
LIMIT 1`;
function iso(value: Date | string | null): string | null { if (!value) return null; const result = value instanceof Date ? value : new Date(String(value).replace(' ', 'T') + (String(value).endsWith('Z') ? '' : 'Z')); return Number.isNaN(result.getTime()) ? null : result.toISOString(); }
function checkoutMode(value: string | null): ReservationCheckoutRecord['checkoutMode'] { return value === 'demo' || value === 'live' ? value : null; }
function checkoutProgress(value: string | null): ReservationCheckoutRecord['checkoutProgress'] { return value === 'pending' || value === 'pix_pending' || value === 'demo_completed' || value === 'paid' ? value : null; }
function checkoutMethod(value: string | null): ReservationCheckoutRecord['checkoutMethod'] { return value === 'pix' || value === 'credit' || value === 'debit' ? value : null; }
function mapRow(row: ReservationCheckoutRow): ReservationCheckoutRecord {
  const durationMinutes = calculateCustomerReservationDuration(row.time, row.endTime);
  if (!durationMinutes) throw new Error('Invalid reservation duration');
  return {
    id: Number(row.id), publicCode: row.publicCode, status: row.status, date: row.date, time: row.time, durationMinutes, guestCount: Number(row.guestCount),
    specialNeeds: (row.specialNeedsCsv ?? '').split(',').map((value) => value.trim()).filter(Boolean), serverNow: iso(row.serverNow) ?? new Date().toISOString(),
    checkoutStartedAt: iso(row.checkoutStartedAt), seatGuaranteeExpiresAt: iso(row.seatGuaranteeExpiresAt), paymentDeadlineAt: iso(row.paymentDeadlineAt),
    checkoutMode: checkoutMode(row.checkoutMode), checkoutProgress: checkoutProgress(row.checkoutProgress), checkoutMethod: checkoutMethod(row.checkoutMethod), pixExpiresAt: iso(row.pixExpiresAt),
    lastPaymentId: row.lastPaymentId, pixDisplayCode: row.pixDisplayCode, pixQrValue: row.pixQrValue, paidAt: iso(row.paidAt),
  };
}
export class MysqlReservationCheckoutQuery { constructor(private readonly executor?: QueryExecutor) {} async findOwned(reservationId: number, customerId: number): Promise<ReservationCheckoutRecord | null> { if (!Number.isSafeInteger(reservationId) || reservationId < 1 || !Number.isSafeInteger(customerId) || customerId < 1) throw new Error('Invalid checkout owner'); const [rows] = await (this.executor ?? getDatabasePool()).execute<ReservationCheckoutRow[]>(reservationCheckoutSql, [reservationId, customerId]); return rows[0] ? mapRow(rows[0]) : null; } }
