import type { Pool, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '@/server/db';
import type {
  CustomerReservationQueryRepository,
  CustomerReservationRecord,
} from '../application/ports';
import { isReservationStatus } from '../domain/reservation-status';
import type { PaymentStatus } from '@/modules/payments/domain/payment';

const paymentStatusValues = new Set<PaymentStatus>(['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded']);
function isCustomerPaymentStatus(value: string): value is PaymentStatus {
  return paymentStatusValues.has(value as PaymentStatus);
}

type QueryExecutor = Pick<Pool, 'execute'>;
type CustomerReservationRow = RowDataPacket & {
  id: number | string;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number | string;
  status: string;
  paymentStatus: string | null;
  notes: string | null;
  specialNeedsCsv: string | null;
};

const CUSTOMER_RESERVATIONS_SQL = `SELECT r.id,
       r.public_code AS publicCode,
       DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
       TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
       TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
       r.guest_count AS guestCount,
       r.status, r.notes,
       COALESCE(
         (SELECT p.status FROM payments p
          WHERE p.reservation_id = r.id
            AND p.status IN ('paid', 'partially_refunded')
          ORDER BY p.id DESC LIMIT 1),
         (SELECT p.status FROM payments p
          WHERE p.reservation_id = r.id
          ORDER BY p.id DESC LIMIT 1)
       ) AS paymentStatus,
       (SELECT GROUP_CONCAT(n.need_code ORDER BY n.need_code SEPARATOR ',')
        FROM reservation_special_needs n
        WHERE n.reservation_id = r.id) AS specialNeedsCsv
FROM reservations r
WHERE r.customer_id = ?
ORDER BY r.reservation_date ASC, r.start_time ASC, r.id ASC
LIMIT ? OFFSET ?`;

function requireSafeInteger(value: number | string, field: string, minimum: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`Invalid ${field} in customer reservation row`);
  }
  return parsed;
}

function mapRow(row: CustomerReservationRow): CustomerReservationRecord {
  if (!isReservationStatus(row.status)) {
    throw new Error('Invalid reservation status in customer reservation row');
  }
  const paymentStatus: PaymentStatus | null = row.paymentStatus === null
    ? null
    : isCustomerPaymentStatus(row.paymentStatus) ? row.paymentStatus : null;
  return {
    id: requireSafeInteger(row.id, 'id', 1),
    publicCode: row.publicCode,
    reservationDate: row.reservationDate,
    startTime: row.startTime,
    endTime: row.endTime,
    guestCount: requireSafeInteger(row.guestCount, 'guestCount', 1),
    status: row.status,
    paymentStatus,
    specialNeeds: (row.specialNeedsCsv ?? '')
      .split(',')
      .map((need) => need.trim())
      .filter((need) => need.length > 0 && need !== 'none'),
    notes: row.notes ?? '',
  };
}

function validatePage(customerId: number, page: { offset: number; limit: number }): void {
  if (!Number.isSafeInteger(customerId) || customerId < 1) throw new Error('Invalid customer id');
  if (!Number.isSafeInteger(page.offset) || page.offset < 0) throw new Error('Invalid offset');
  if (page.limit !== 21) throw new Error('Invalid page limit');
}

export class MysqlCustomerReservationQueryRepository implements CustomerReservationQueryRepository {
  constructor(private readonly injectedExecutor?: QueryExecutor) {}

  async listByCustomerId(
    customerId: number,
    page: { offset: number; limit: number },
  ): Promise<CustomerReservationRecord[]> {
    validatePage(customerId, page);
    const executor = this.injectedExecutor ?? getDatabasePool();
    const [rows] = await executor.execute<CustomerReservationRow[]>(
      CUSTOMER_RESERVATIONS_SQL,
      [customerId, page.limit, page.offset],
    );
    return rows.map(mapRow);
  }
}
