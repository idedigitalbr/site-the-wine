import 'server-only';
import { createHmac } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import { CustomerAuthError } from './errors';

type RateLimitRow = RowDataPacket & { hit_count: number; retry_after: number };

function rateKey(scope: string, identity: string): string {
  const secret = process.env.CUSTOMER_CPF_LOOKUP_SECRET;
  if (!secret || secret.length < 32) throw new Error('Customer auth is not configured');
  return createHmac('sha256', secret).update(`${scope}:${identity}`).digest('hex');
}

export async function recordRateLimitAttempt(
  scope: string,
  identity: string,
  maxAttempts: number,
  windowMs: number,
): Promise<void> {
  const bucket = rateKey(scope, identity);
  const pool = getDatabasePool();
  const threshold = 'TIMESTAMPADD(MICROSECOND, -?, UTC_TIMESTAMP(3))';
  await pool.execute(
    `INSERT INTO customer_auth_rate_limits (bucket_key, window_started_at, hit_count)
     VALUES (?, UTC_TIMESTAMP(3), 1)
     ON DUPLICATE KEY UPDATE
       hit_count = IF(window_started_at <= ${threshold}, 1, hit_count + 1),
       window_started_at = IF(window_started_at <= ${threshold}, UTC_TIMESTAMP(3), window_started_at)`,
    [bucket, windowMs * 1000, windowMs * 1000],
  );
  await pool.execute(
    `DELETE FROM customer_auth_rate_limits
     WHERE window_started_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 DAY)
     LIMIT 100`,
  );
  const [rows] = await pool.execute<RateLimitRow[]>(
    `SELECT hit_count,
       GREATEST(1, CEIL(TIMESTAMPDIFF(MICROSECOND, UTC_TIMESTAMP(3),
         TIMESTAMPADD(MICROSECOND, ?, window_started_at)) / 1000000)) AS retry_after
     FROM customer_auth_rate_limits WHERE bucket_key = ? LIMIT 1`,
    [windowMs * 1000, bucket],
  );
  const row = rows[0];
  if (!row || Number(row.hit_count) <= maxAttempts) return;

  const retryAfter = Math.max(1, Number(row.retry_after));
  throw new CustomerAuthError('Muitas tentativas. Aguarde um pouco e tente novamente.', 429, `RATE_LIMIT:${retryAfter}`);
}

export async function clearRateLimit(scope: string, identity: string): Promise<void> {
  const bucket = rateKey(scope, identity);
  await getDatabasePool().execute('DELETE FROM customer_auth_rate_limits WHERE bucket_key = ?', [bucket]);
}
