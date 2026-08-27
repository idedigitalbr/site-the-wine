import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type {
  CustomerRepository,
  CustomerUpsertInput,
} from '../application/ports';

type CustomerIdRow = RowDataPacket & { id: number };

export class MysqlCustomerRepository implements CustomerRepository {
  async findByNormalizedPhone(normalizedPhone: string): Promise<number | null> {
    const [rows] = await getDatabasePool().execute<CustomerIdRow[]>(
      'SELECT id FROM customers WHERE normalized_phone = ? LIMIT 1',
      [normalizedPhone],
    );
    return rows[0] ? Number(rows[0].id) : null;
  }

  async upsert(input: CustomerUpsertInput): Promise<number> {
    const existingId = await this.findByNormalizedPhone(input.normalizedPhone);
    if (existingId) {
      await getDatabasePool().execute(
        `UPDATE customers
         SET name = ?, phone = ?, email = ?, marketing_consent = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [input.name, input.phone, input.email, input.marketingConsent, existingId],
      );
      return existingId;
    }

    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `INSERT INTO customers
        (name, phone, normalized_phone, email, marketing_consent)
       VALUES (?, ?, ?, ?, ?)`,
      [input.name, input.phone, input.normalizedPhone, input.email, input.marketingConsent],
    );
    return result.insertId;
  }
}
