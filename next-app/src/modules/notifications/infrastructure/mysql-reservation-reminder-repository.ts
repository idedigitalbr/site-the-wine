import type { RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type {
  ReminderReservationCandidate,
  ReservationReminderRepository,
} from '../application/ports';

type ReminderReservationRow = RowDataPacket & {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  email: string;
};

export class MysqlReservationReminderRepository implements ReservationReminderRepository {
  async listUpcoming(): Promise<ReminderReservationCandidate[]> {
    const [rows] = await getDatabasePool().query<ReminderReservationRow[]>(
      `SELECT
         r.id,
         r.public_code AS publicCode,
         DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservationDate,
         TIME_FORMAT(r.start_time, '%H:%i') AS startTime,
         TIME_FORMAT(r.end_time, '%H:%i') AS endTime,
         r.guest_count AS guestCount,
         c.email
       FROM reservations r
       INNER JOIN customers c ON c.id = r.customer_id
       WHERE r.reservation_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 2 DAY)
         AND r.status IN ('confirmed', 'pending')
         AND c.email IS NOT NULL
         AND c.email <> ''
       ORDER BY r.reservation_date, r.start_time, r.id`,
    );
    return rows.map((row) => ({
      id: Number(row.id),
      publicCode: row.publicCode,
      reservationDate: row.reservationDate,
      startTime: row.startTime,
      endTime: row.endTime,
      guestCount: Number(row.guestCount),
      email: row.email,
    }));
  }
}
