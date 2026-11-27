import 'server-only';

import type { RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import { ensureCustomerForAuthUser } from '@/server/customer-auth/repository';
import { CustomerAuthError } from '@/server/customer-auth/errors';
import type { AccountTransaction } from '@/types/account-settings';

export type AccountSettingsRow = RowDataPacket & {
  userId: string;
  userName: string;
  userEmail: string;
  userMarketingConsent: number | boolean;
  customerId: number | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerNormalizedPhone: string | null;
  customerMarketingConsent: number | boolean | null;
};

type CustomerPhoneConflictRow = RowDataPacket & {
  id: number;
  authUserId: string | null;
};

type PaymentTransactionRow = RowDataPacket & {
  id: string | number;
  formattedDate: string;
  description: string;
  method: 'pix' | 'card' | string;
  status: string;
  amount: number | string;
};

export async function findAccountSettingsByUserId(userId: string): Promise<AccountSettingsRow> {
  await ensureCustomerForAuthUser(userId);
  const [rows] = await getDatabasePool().execute<AccountSettingsRow[]>(
    `SELECT u.id AS userId, u.name AS userName, u.email AS userEmail, u.marketing_consent AS userMarketingConsent,
            c.id AS customerId, c.name AS customerName, c.email AS customerEmail,
            c.phone AS customerPhone, c.normalized_phone AS customerNormalizedPhone,
            c.marketing_consent AS customerMarketingConsent
     FROM \`user\` u
     LEFT JOIN customers c ON c.auth_user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId],
  );
  if (!rows[0]) throw new Error('Account settings could not be found');
  return rows[0];
}

export async function updateCustomerProfileInTransaction(
  userId: string,
  input: { name: string; email: string },
): Promise<void> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE \`user\`
       SET name = ?, email = ?, updatedAt = UTC_TIMESTAMP()
       WHERE id = ?`,
      [input.name, input.email, userId],
    );
    await connection.execute(
      `UPDATE customers
       SET name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
       WHERE auth_user_id = ?`,
      [input.name, input.email, userId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCustomerWhatsAppInTransaction(
  userId: string,
  input: { formattedPhone: string; normalizedPhone: string },
): Promise<void> {
  await ensureCustomerForAuthUser(userId);
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<CustomerPhoneConflictRow[]>(
      `SELECT id, auth_user_id AS authUserId
       FROM customers
       WHERE normalized_phone = ?
       LIMIT 1 FOR UPDATE`,
      [input.normalizedPhone],
    );
    const conflict = rows[0];
    if (conflict && conflict.authUserId !== userId) {
      throw new CustomerAuthError(
        'Este número de WhatsApp já está vinculado a outro cadastro.',
        409,
        'PHONE_UNAVAILABLE',
      );
    }
    await connection.execute(
      `UPDATE customers
       SET phone = ?, normalized_phone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE auth_user_id = ?`,
      [input.formattedPhone, input.normalizedPhone, userId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateCustomerMarketingConsent(
  userId: string,
  marketingConsent: boolean,
): Promise<void> {
  const pool = getDatabasePool();
  await pool.execute('UPDATE `user` SET marketing_consent = ? WHERE id = ?', [marketingConsent, userId]);
  await pool.execute(
    'UPDATE customers SET marketing_consent = ? WHERE auth_user_id = ?',
    [marketingConsent, userId],
  );
}

export async function listCustomerTransactionsByUserId(userId: string): Promise<AccountTransaction[]> {
  const [rows] = await getDatabasePool().execute<PaymentTransactionRow[]>(
    `SELECT
       CONCAT('pay-', p.id) AS id,
       DATE_FORMAT(COALESCE(p.paid_at, p.created_at), '%d/%m/%Y') AS formattedDate,
       p.description,
       p.method,
       p.status,
       p.amount
     FROM payments p
     INNER JOIN reservations r ON r.id = p.reservation_id
     INNER JOIN customers c ON c.id = r.customer_id
     WHERE c.auth_user_id = ?
     ORDER BY COALESCE(p.paid_at, p.created_at) DESC, p.id DESC
     LIMIT 100`,
    [userId],
  );
  return rows.map(mapPaymentTransaction);
}

function mapPaymentTransaction(row: PaymentTransactionRow): AccountTransaction {
  const isRefund = row.status === 'refunded' || row.status === 'partially_refunded';
  return {
    id: String(row.id),
    date: row.formattedDate,
    description: row.description,
    type: isRefund ? 'Reembolso' : 'Reserva',
    paymentBrand: row.method === 'pix' ? 'pix' : 'visa',
    paymentDetails: row.method === 'pix' ? 'PIX' : 'Cartão',
    status: mapPaymentStatus(row.status),
    amount: formatCurrency(row.amount),
  };
}

function mapPaymentStatus(status: string): AccountTransaction['status'] {
  if (status === 'cancelled' || status === 'failed') return 'Cancelado';
  if (status === 'refunded' || status === 'partially_refunded') return 'Concluído';
  return 'Pago';
}

function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(amount));
}
