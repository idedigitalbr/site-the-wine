import type { ResultSetHeader } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type { ReservationId, ReservationRepository } from '../application/ports';
import type { ReservationDraft } from '../domain/reservation';

export class MysqlReservationRepository implements ReservationRepository {
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
}
