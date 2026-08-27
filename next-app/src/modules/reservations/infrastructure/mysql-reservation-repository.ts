import type { ResultSetHeader } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type { ReservationRepository } from '../application/ports';
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
}
