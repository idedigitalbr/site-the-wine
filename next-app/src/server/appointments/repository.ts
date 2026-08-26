import { getDatabasePool } from '@/server/db';
import type { RowDataPacket } from 'mysql2';
import type { AppointmentInput, AppointmentRecord, AppointmentStatus } from './types';

type AppointmentRow = RowDataPacket & {
  id: number;
  reservation_date: string;
  reservation_time: string;
  guest_count: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  experience: AppointmentRecord['experience'];
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: AppointmentRow): AppointmentRecord {
  return {
    id: row.id,
    reservationDate: row.reservation_date,
    reservationTime: row.reservation_time,
    guestCount: row.guest_count,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email ?? undefined,
    experience: row.experience,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAppointmentsByDate(
  reservationDate: string,
): Promise<AppointmentRecord[]> {
  const [rows] = await getDatabasePool().execute<AppointmentRow[]>(
    `SELECT id, reservation_date, reservation_time, guest_count,
       customer_name, customer_phone, customer_email, experience, status,
       notes, created_at, updated_at
     FROM appointments
     WHERE reservation_date = ?
       AND status IN ('pending', 'confirmed')
     ORDER BY reservation_time ASC, id ASC`,
    [reservationDate],
  );

  return rows.map(mapRow);
}

export async function createAppointment(input: AppointmentInput): Promise<number> {
  const [result] = await getDatabasePool().execute(
    `INSERT INTO appointments
      (reservation_date, reservation_time, guest_count, customer_name,
       customer_phone, customer_email, experience, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.reservationDate,
      input.reservationTime,
      input.guestCount,
      input.customerName,
      input.customerPhone,
      input.customerEmail ?? null,
      input.experience ?? 'jantar',
      input.notes ?? null,
    ],
  );

  return Number((result as { insertId: number }).insertId);
}
