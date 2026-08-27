import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { getDatabasePool } from '@/server/db';
import { canTransitionPayment, type Payment, type PaymentMethod, type PaymentStatus } from '../domain/payment';
import type {
  CreatePaymentInput,
  GatewayPayment,
  GatewayRefund,
  PaymentRepository,
  WebhookEvent,
  WebhookEventRepository,
} from '../application/ports';

type PaymentRow = RowDataPacket & {
  id: number;
  reservationId: number;
  provider: string;
  externalId: string | null;
  idempotencyKey: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number | string;
  currency: 'BRL';
  providerStatus: string | null;
  description: string;
  payerEmail: string;
  checkoutUrl: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type WebhookEventRow = RowDataPacket & {
  id: number;
  provider: string;
  externalEventId: string;
  status: WebhookEvent['status'];
};

type PaymentStateRow = RowDataPacket & { status: PaymentStatus; reservationId: number };
type RefundBalanceRow = RowDataPacket & { paymentAmount: number | string; refundedAmount: number | string };

const paymentSelect = `
  SELECT
    id, reservation_id AS reservationId, provider, external_id AS externalId,
    idempotency_key AS idempotencyKey, status, method, amount, currency,
    provider_status AS providerStatus, description, payer_email AS payerEmail,
    checkout_url AS checkoutUrl, pix_qr_code AS pixQrCode,
    pix_copy_paste AS pixCopyPaste, paid_at AS paidAt, refunded_at AS refundedAt,
    created_at AS createdAt, updated_at AS updatedAt
  FROM payments`;

function mapPayment(row: PaymentRow): Payment {
  return {
    id: Number(row.id),
    reservationId: Number(row.reservationId),
    provider: row.provider,
    externalId: row.externalId,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    method: row.method,
    amount: Number(row.amount),
    currency: 'BRL',
    providerStatus: row.providerStatus,
    description: row.description,
    payerEmail: row.payerEmail,
    checkoutUrl: row.checkoutUrl,
    pixQrCode: row.pixQrCode,
    pixCopyPaste: row.pixCopyPaste,
    paidAt: row.paidAt,
    refundedAt: row.refundedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isDuplicateEntry(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 500) : 'Unknown payment error';
}

async function withTransaction<T>(operation: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

export class MysqlPaymentRepository implements PaymentRepository, WebhookEventRepository {
  async findById(id: number): Promise<Payment | null> {
    const [rows] = await getDatabasePool().execute<PaymentRow[]>(`${paymentSelect} WHERE id = ? LIMIT 1`, [id]);
    return rows[0] ? mapPayment(rows[0]) : null;
  }

  async findByIdempotencyKey(provider: string, idempotencyKey: string): Promise<Payment | null> {
    const [rows] = await getDatabasePool().execute<PaymentRow[]>(
      `${paymentSelect} WHERE provider = ? AND idempotency_key = ? LIMIT 1`,
      [provider, idempotencyKey],
    );
    return rows[0] ? mapPayment(rows[0]) : null;
  }

  async findByExternalId(provider: string, externalId: string): Promise<Payment | null> {
    const [rows] = await getDatabasePool().execute<PaymentRow[]>(
      `${paymentSelect} WHERE provider = ? AND external_id = ? LIMIT 1`,
      [provider, externalId],
    );
    return rows[0] ? mapPayment(rows[0]) : null;
  }

  async getReservationId(reservationId: number): Promise<number | null> {
    const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
      'SELECT id FROM reservations WHERE id = ? LIMIT 1',
      [reservationId],
    );
    return rows[0] ? Number(rows[0].id) : null;
  }

  async createPending(input: CreatePaymentInput & { provider: string }): Promise<{ payment: Payment; created: boolean }> {
    try {
      const [result] = await getDatabasePool().execute<ResultSetHeader>(
        `INSERT INTO payments
          (reservation_id, provider, idempotency_key, status, method, amount, currency, description, payer_email)
         VALUES (?, ?, ?, 'pending', ?, ?, 'BRL', ?, ?)`,
        [input.reservationId, input.provider, input.idempotencyKey, input.method, input.amount, input.description, input.payerEmail],
      );
      const payment = await this.findById(result.insertId);
      if (!payment) throw new Error('Payment could not be created');
      return { payment, created: true };
    } catch (error) {
      if (!isDuplicateEntry(error)) throw error;
      const payment = await this.findByIdempotencyKey(input.provider, input.idempotencyKey);
      if (!payment) throw error;
      return { payment, created: false };
    }
  }

  private async updatePaymentFromGateway(id: number, gatewayPayment: GatewayPayment): Promise<Payment> {
    await withTransaction(async (connection) => {
      const [rows] = await connection.execute<PaymentStateRow[]>(
        'SELECT status, reservation_id AS reservationId FROM payments WHERE id = ? FOR UPDATE',
        [id],
      );
      const current = rows[0];
      if (!current) throw new Error('Payment not found');
      const shouldUpdate = canTransitionPayment(current.status, gatewayPayment.status);
      if (!shouldUpdate) return;
      await connection.execute(
        `UPDATE payments
         SET external_id = ?, status = ?, provider_status = ?, checkout_url = ?,
             pix_qr_code = ?, pix_copy_paste = ?,
             paid_at = IF(? = 'paid', COALESCE(paid_at, CURRENT_TIMESTAMP), paid_at)
         WHERE id = ?`,
        [gatewayPayment.externalId, gatewayPayment.status, gatewayPayment.providerStatus, gatewayPayment.checkoutUrl, gatewayPayment.pixQrCode, gatewayPayment.pixCopyPaste, gatewayPayment.status, id],
      );
      if (gatewayPayment.status === 'paid') {
        await connection.execute(
          `UPDATE reservations
           SET status = 'confirmed'
           WHERE id = ? AND status IN ('pending', 'payment_pending')`,
          [current.reservationId],
        );
      }
    });
    const payment = await this.findById(id);
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  attachGatewayPayment(id: number, gatewayPayment: GatewayPayment): Promise<Payment> {
    return this.updatePaymentFromGateway(id, gatewayPayment);
  }

  applyGatewayPayment(id: number, gatewayPayment: GatewayPayment): Promise<Payment> {
    return this.updatePaymentFromGateway(id, gatewayPayment);
  }

  async markGatewayFailure(id: number, message: string): Promise<void> {
    await getDatabasePool().execute(
      `UPDATE payments
       SET status = IF(status IN ('pending', 'processing'), 'failed', status),
           provider_status = ?
       WHERE id = ?`,
      [`local_error:${message.slice(0, 35)}`, id],
    );
  }

  async createRefund(input: { paymentId: number; provider: string; amount: number; reason: string | null; idempotencyKey: string; requestedByEmail: string | null }): Promise<{ refundId: number; created: boolean }> {
    return withTransaction(async (connection) => {
      const [balanceRows] = await connection.execute<RefundBalanceRow[]>(
        `SELECT p.amount AS paymentAmount,
                COALESCE(SUM(CASE WHEN r.status = 'processed' THEN r.amount ELSE 0 END), 0) AS refundedAmount
         FROM payments p
         LEFT JOIN refunds r ON r.payment_id = p.id
         WHERE p.id = ? AND p.status IN ('paid', 'partially_refunded')
         GROUP BY p.id
         FOR UPDATE`,
        [input.paymentId],
      );
      const balance = balanceRows[0];
      if (!balance || input.amount > Number(balance.paymentAmount) - Number(balance.refundedAmount)) {
        throw new Error('Invalid refund amount');
      }
      try {
        const [result] = await connection.execute<ResultSetHeader>(
          `INSERT INTO refunds (payment_id, provider, amount, reason, idempotency_key, requested_by_email)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [input.paymentId, input.provider, input.amount, input.reason, input.idempotencyKey, input.requestedByEmail],
        );
        return { refundId: result.insertId, created: true };
      } catch (error) {
        if (!isDuplicateEntry(error)) throw error;
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM refunds WHERE provider = ? AND idempotency_key = ? LIMIT 1',
          [input.provider, input.idempotencyKey],
        );
        if (!rows[0]) throw error;
        return { refundId: Number(rows[0].id), created: false };
      }
    });
  }

  async attachGatewayRefund(id: number, refund: GatewayRefund): Promise<void> {
    await withTransaction(async (connection) => {
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT payment_id AS paymentId, amount FROM refunds WHERE id = ? FOR UPDATE',
        [id],
      );
      const localRefund = rows[0];
      if (!localRefund) throw new Error('Refund not found');
      await connection.execute(
        `UPDATE refunds SET external_id = ?, status = ?, processed_at = IF(? = 'processed', CURRENT_TIMESTAMP, processed_at) WHERE id = ?`,
        [refund.externalId, refund.status, refund.status, id],
      );
      if (refund.status !== 'processed') return;
      const [balanceRows] = await connection.execute<RefundBalanceRow[]>(
        `SELECT p.amount AS paymentAmount,
                COALESCE(SUM(CASE WHEN r.status = 'processed' THEN r.amount ELSE 0 END), 0) AS refundedAmount
         FROM payments p
         INNER JOIN refunds r ON r.payment_id = p.id
         WHERE p.id = ?
         GROUP BY p.id`,
        [localRefund.paymentId],
      );
      const balance = balanceRows[0];
      if (!balance) return;
      const fullyRefunded = Number(balance.refundedAmount) >= Number(balance.paymentAmount);
      await connection.execute(
        `UPDATE payments
         SET status = ?, refunded_at = IF(? = 'refunded', COALESCE(refunded_at, CURRENT_TIMESTAMP), refunded_at)
         WHERE id = ?`,
        [fullyRefunded ? 'refunded' : 'partially_refunded', fullyRefunded ? 'refunded' : 'partially_refunded', localRefund.paymentId],
      );
    });
  }

  async markRefundFailure(id: number, message: string): Promise<void> {
    await getDatabasePool().execute(
      `UPDATE refunds SET status = 'failed', reason = COALESCE(reason, ?) WHERE id = ?`,
      [errorMessage(message), id],
    );
  }

  async register(provider: string, event: { externalEventId: string; requestId: string | null; eventType: string; action: string | null; signature: string | null; payload: string }): Promise<WebhookEvent> {
    return withTransaction(async (connection) => {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO webhook_events
          (provider, external_event_id, request_id, event_type, action, signature, payload, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'received')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [provider, event.externalEventId, event.requestId, event.eventType, event.action, event.signature, event.payload],
      );
      const [rows] = await connection.execute<WebhookEventRow[]>(
        'SELECT id, provider, external_event_id AS externalEventId, status FROM webhook_events WHERE id = ? FOR UPDATE',
        [result.insertId],
      );
      const current = rows[0];
      if (!current) throw new Error('Webhook event could not be registered');
      if (current.status === 'processed' || current.status === 'ignored' || current.status === 'processing') {
        return { id: Number(current.id), provider: current.provider, externalEventId: current.externalEventId, status: current.status };
      }
      await connection.execute(
        `UPDATE webhook_events
         SET status = 'processing', attempts = attempts + 1, last_error = NULL
         WHERE id = ?`,
        [current.id],
      );
      return { id: Number(current.id), provider: current.provider, externalEventId: current.externalEventId, status: 'processing' };
    });
  }

  async markProcessed(id: number): Promise<void> {
    await getDatabasePool().execute(
      `UPDATE webhook_events SET status = 'processed', processed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id],
    );
  }

  async markIgnored(id: number, reason: string): Promise<void> {
    await getDatabasePool().execute(
      `UPDATE webhook_events SET status = 'ignored', last_error = ? WHERE id = ?`,
      [reason.slice(0, 500), id],
    );
  }

  async markFailed(id: number, message: string): Promise<void> {
    await getDatabasePool().execute(
      `UPDATE webhook_events SET status = 'failed', last_error = ? WHERE id = ?`,
      [errorMessage(message), id],
    );
  }

  async recordPaymentEvent(input: { paymentId: number | null; provider: string; externalEventId: string; eventType: string; action: string | null; providerStatus: string | null; payload: string }): Promise<void> {
    await getDatabasePool().execute(
      `INSERT INTO payment_events
        (payment_id, provider, external_event_id, event_type, action, provider_status, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.paymentId, input.provider, input.externalEventId, input.eventType, input.action, input.providerStatus, input.payload],
    );
  }
}
