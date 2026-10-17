import 'server-only';
import type { RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import { hashCustomerCpf, hashReservationFlowId } from './crypto';

type CustomerAccountRow = RowDataPacket & { id: string; email: string };
type CustomerProfileRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  birth_date: string;
  marketing_consent: number;
};
type FlowRow = RowDataPacket & { user_id: string; customer_id: number; expires_at: Date | string; is_expired: number };

export async function findCustomerAccountByCpf(cpf: string): Promise<CustomerAccountRow | null> {
  const [rows] = await getDatabasePool().execute<CustomerAccountRow[]>(
    'SELECT id, email FROM `user` WHERE cpf_lookup_hash = ? LIMIT 1',
    [hashCustomerCpf(cpf)],
  );
  return rows[0] ?? null;
}
export async function ensureCustomerForAuthUser(userId: string): Promise<CustomerProfileRow> {
  const pool = getDatabasePool();
  await pool.execute(
    `INSERT INTO customers (auth_user_id, name, phone, normalized_phone, email, birth_date, marketing_consent)
     SELECT id, name, NULL, NULL, email, birth_date, marketing_consent
     FROM \`user\`
     WHERE id = ?
     ON DUPLICATE KEY UPDATE auth_user_id = VALUES(auth_user_id)`,
    [userId],
  );
  const [rows] = await pool.execute<CustomerProfileRow[]>(
    `SELECT id, name, email, birth_date, marketing_consent
     FROM customers WHERE auth_user_id = ? LIMIT 1`,
    [userId],
  );
  if (!rows[0]) throw new Error('Customer profile could not be provisioned');
  return rows[0];
}

export async function createReservationFlow(
  flowId: string,
  userId: string,
  customerId: number,
  expiresAt: Date,
): Promise<void> {
  await getDatabasePool().execute(
    `INSERT INTO customer_reservation_flows (flow_id_hash, user_id, customer_id, expires_at)
     VALUES (?, ?, ?, ?)`,
    [hashReservationFlowId(flowId), userId, customerId, expiresAt],
  );
}

export async function findReservationFlow(flowId: string): Promise<FlowRow | null> {
  const [rows] = await getDatabasePool().execute<FlowRow[]>(
    `SELECT user_id, customer_id, expires_at, expires_at <= UTC_TIMESTAMP() AS is_expired
     FROM customer_reservation_flows
     WHERE flow_id_hash = ?
     LIMIT 1`,
    [hashReservationFlowId(flowId)],
  );
  return rows[0] ?? null;
}
