import type { ResultSetHeader } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type { CreateWaitlistEntryInput, WaitlistRepository } from '../application/ports';

export class MysqlWaitlistRepository implements WaitlistRepository {
  async create(input: CreateWaitlistEntryInput): Promise<number> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO waitlist
        (customer_id, reservation_date, preferred_time, guest_count, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [input.customerId, input.reservationDate, input.preferredTime, input.guestCount, input.notes || null],
    );
    return Number(result.insertId);
  }
}
