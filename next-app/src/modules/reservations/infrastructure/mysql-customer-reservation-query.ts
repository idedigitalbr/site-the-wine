import type { Pool, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '@/server/db';
import type {
  CustomerReservationQueryRepository,
  CustomerReservationRecord,
} from '../application/ports';
import { isReservationStatus } from '../domain/reservation-status';

type QueryExecutor = Pick<Pool, 'execute'>;
type CustomerReservationRow = RowDataPacket & {
  id: number | string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number | string;
  status: string;
  notes: string | null;
  specialNeedsCsv: string | null;
};

const CUSTOMER_RESERVATIONS_SQL = `SELECT r.id,
       DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
       TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
       TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
       r.guest_count AS guestCount,
       r.status, r.notes,
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
  return {
    id: requireSafeInteger(row.id, 'id', 1),
    reservationDate: row.reservationDate,
    startTime: row.startTime,
    endTime: row.endTime,
    guestCount: requireSafeInteger(row.guestCount, 'guestCount', 1),
    status: row.status,
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
