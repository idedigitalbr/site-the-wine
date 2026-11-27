import 'server-only';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import type { RowDataPacket } from 'mysql2';
import {
  isRecoveryPasswordValid,
  parseRecoveryIdentifier,
  RECOVERY_CODE_TTL_SECONDS,
  requestRecoveryCodeSchema,
  resetRecoveredPasswordSchema,
  verifyRecoveryCodeSchema,
} from '@/modules/customer-auth/domain/password-recovery';
import { getDatabasePool } from '@/server/db';
import { hashCustomerCpf } from './crypto';
import { CustomerAuthError } from './errors';
import { sendSmtpMail } from './smtp-mailer';

const MAX_CODE_VERIFY_ATTEMPTS = 5;

type UserRecoveryRow = RowDataPacket & {
  id: string;
  name: string;
  email: string;
};

type VerificationRow = RowDataPacket & {
  id: string;
  identifier: string;
  value: string;
  isExpired: number;
};

type StoredOtpValue = {
  codeHash: string;
  attempts: number;
};

function recoverySecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim() || process.env.CUSTOMER_CPF_LOOKUP_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error('Recovery secret must contain at least 32 characters');
  return secret;
}

export function hashRecoveryOtp(userId: string, code: string): string {
  return createHmac('sha256', recoverySecret()).update(`otp:${userId}:${code}`).digest('hex');
}

export function hashRecoveryResetToken(rawToken: string): string {
  return createHash('sha256').update(`reset:${rawToken}`).digest('hex');
}

export function generateSixDigitRecoveryCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function findUserByRecoveryIdentifier(
  kind: 'email' | 'cpf',
  normalizedValue: string,
): Promise<UserRecoveryRow | null> {
  const pool = getDatabasePool();
  const query = kind === 'cpf'
    ? 'SELECT id, name, email FROM `user` WHERE cpf_lookup_hash = ? LIMIT 1'
    : 'SELECT id, name, email FROM `user` WHERE email = ? LIMIT 1';
  const param = kind === 'cpf' ? hashCustomerCpf(normalizedValue) : normalizedValue;
  const [rows] = await pool.execute<UserRecoveryRow[]>(query, [param]);
  return rows[0] ?? null;
}

async function saveUserRecoveryOtp(userId: string, code: string): Promise<void> {
  const pool = getDatabasePool();
  const identifier = `pwd-otp:${userId}`;
  const payload: StoredOtpValue = { codeHash: hashRecoveryOtp(userId, code), attempts: 0 };
  await pool.execute('DELETE FROM verification WHERE identifier = ?', [identifier]);
  await pool.execute(
    `INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt)
     VALUES (UUID(), ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [identifier, JSON.stringify(payload)],
  );
}

export async function requestPasswordRecoveryCode(body: unknown): Promise<{
  status: 'code_sent';
  expiresInSeconds: number;
}> {
  const parsed = requestRecoveryCodeSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError('Digite seu e-mail ou CPF.', 400, 'INVALID_IDENTIFIER');
  }
  const identifier = parseRecoveryIdentifier(parsed.data.identifier);
  if (!identifier.ok) {
    throw new CustomerAuthError(identifier.message, 400, 'INVALID_IDENTIFIER');
  }

  const user = await findUserByRecoveryIdentifier(identifier.kind, identifier.normalizedValue);
  if (!user) {
    return { status: 'code_sent', expiresInSeconds: RECOVERY_CODE_TTL_SECONDS };
  }

  const code = generateSixDigitRecoveryCode();
  await saveUserRecoveryOtp(user.id, code);
  await sendRecoveryCodeEmail(user.email, user.name, code);
  return { status: 'code_sent', expiresInSeconds: RECOVERY_CODE_TTL_SECONDS };
}

async function sendRecoveryCodeEmail(email: string, name: string, code: string): Promise<void> {
  const firstName = name.trim().split(/\s+/)[0] || 'Cliente';
  const subject = `${code} é o seu código de recuperação — The Wine Experience`;
  const text = [
    `Olá, ${firstName}!`,
    '',
    `Seu código de verificação para redefinir sua senha no The Wine Experience é: ${code}`,
    '',
    'Atenção: este código expira em 10 minutos.',
    'Se você não solicitou a recuperação de senha, basta ignorar este e-mail.',
  ].join('\n');
  const html = [
    '<div style="background:#050505;color:#f7f4ef;font-family:Arial,sans-serif;padding:36px 24px;max-width:520px;margin:0 auto;border:1px solid #d3b97b;border-radius:12px;">',
    '<p style="color:#e5c06a;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;margin:0 0 12px;">The Wine Experience</p>',
    `<h1 style="font-size:26px;font-weight:400;margin:0 0 16px;color:#f7f4ef;">Olá, ${escapeHtml(firstName)}</h1>`,
    '<p style="color:#e2e0dc;font-size:15px;line-height:1.6;margin:0 0 24px;">Use o código de verificação abaixo para redefinir a senha da sua conta:</p>',
    `<div style="background:#110f0b;border:1px solid #e5c06a;border-radius:8px;padding:18px;text-align:center;font-size:32px;letter-spacing:0.32em;font-weight:700;color:#f3ca69;margin:0 0 24px;">${code}</div>`,
    '<p style="color:#b8c8d9;font-size:13px;line-height:1.5;margin:0;">Este código é válido por <strong>10 minutos</strong>. Se você não solicitou esta alteração, ignore este e-mail com segurança.</p>',
    '</div>',
  ].join('');
  await sendSmtpMail({ to: email, subject, text, html });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] ?? char));
}

export async function verifyPasswordRecoveryCode(body: unknown): Promise<{
  status: 'verified';
  resetToken: string;
}> {
  const parsed = verifyRecoveryCodeSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError('Digite os 6 números do código enviado ao seu e-mail.', 400, 'INVALID_CODE_FORMAT');
  }
  const identifier = parseRecoveryIdentifier(parsed.data.identifier);
  if (!identifier.ok) {
    throw new CustomerAuthError(identifier.message, 400, 'INVALID_IDENTIFIER');
  }

  const user = await findUserByRecoveryIdentifier(identifier.kind, identifier.normalizedValue);
  if (!user) throw invalidOrExpiredCodeError();

  return verifyUserOtpAndIssueResetToken(user.id, parsed.data.code);
}

async function verifyUserOtpAndIssueResetToken(userId: string, code: string): Promise<{
  status: 'verified';
  resetToken: string;
}> {
  const pool = getDatabasePool();
  const otpIdentifier = `pwd-otp:${userId}`;
  const [rows] = await pool.execute<VerificationRow[]>(
    `SELECT id, identifier, value, expiresAt <= UTC_TIMESTAMP() AS isExpired
     FROM verification WHERE identifier = ? LIMIT 1`,
    [otpIdentifier],
  );
  const row = rows[0];
  if (!row || Boolean(row.isExpired)) {
    if (row) await pool.execute('DELETE FROM verification WHERE id = ?', [row.id]);
    throw expiredCodeError();
  }

  const stored = parseStoredOtpValue(row.value);
  const expectedHash = hashRecoveryOtp(userId, code);
  if (!hashesMatch(stored.codeHash, expectedHash)) {
    await handleFailedOtpAttempt(row.id, stored);
  }

  await pool.execute('DELETE FROM verification WHERE id = ?', [row.id]);
  const resetToken = randomBytes(32).toString('base64url');
  const resetIdentifier = `pwd-reset:${hashRecoveryResetToken(resetToken)}`;
  await pool.execute(
    `INSERT INTO verification (id, identifier, value, expiresAt, createdAt, updatedAt)
     VALUES (UUID(), ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE), UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [resetIdentifier, userId],
  );
  return { status: 'verified', resetToken };
}

function parseStoredOtpValue(raw: string): StoredOtpValue {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredOtpValue>;
    return {
      codeHash: typeof parsed.codeHash === 'string' ? parsed.codeHash : '',
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
    };
  } catch {
    return { codeHash: '', attempts: MAX_CODE_VERIFY_ATTEMPTS };
  }
}

function hashesMatch(hashA: string, hashB: string): boolean {
  if (hashA.length !== hashB.length || hashA.length === 0) return false;
  return timingSafeEqual(Buffer.from(hashA, 'utf8'), Buffer.from(hashB, 'utf8'));
}

async function handleFailedOtpAttempt(verificationId: string, stored: StoredOtpValue): Promise<never> {
  const pool = getDatabasePool();
  const nextAttempts = stored.attempts + 1;
  if (nextAttempts >= MAX_CODE_VERIFY_ATTEMPTS) {
    await pool.execute('DELETE FROM verification WHERE id = ?', [verificationId]);
    throw new CustomerAuthError(
      'Número máximo de tentativas excedido. Clique em "Reenviar código" para receber um novo código.',
      400,
      'CODE_MAX_ATTEMPTS',
    );
  }
  await pool.execute(
    'UPDATE verification SET value = ?, updatedAt = UTC_TIMESTAMP() WHERE id = ?',
    [JSON.stringify({ codeHash: stored.codeHash, attempts: nextAttempts }), verificationId],
  );
  throw invalidOrExpiredCodeError();
}

function invalidOrExpiredCodeError(): CustomerAuthError {
  return new CustomerAuthError(
    'Código inválido. Confira os 6 dígitos enviados ao seu e-mail.',
    400,
    'INVALID_RECOVERY_CODE',
  );
}

function expiredCodeError(): CustomerAuthError {
  return new CustomerAuthError(
    'Este código expirou (validade de 10 minutos). Clique em "Reenviar código" para receber um novo.',
    400,
    'RECOVERY_CODE_EXPIRED',
  );
}

export async function resetCustomerPassword(body: unknown): Promise<{ status: 'password_reset' }> {
  const parsed = resetRecoveredPasswordSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerAuthError('Confira os campos da nova senha.', 400, 'INVALID_PASSWORD_RESET');
  }
  const { resetToken, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    throw new CustomerAuthError('As senhas digitadas não coincidem.', 400, 'PASSWORD_MISMATCH');
  }
  if (!isRecoveryPasswordValid(newPassword)) {
    throw new CustomerAuthError(
      'A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.',
      400,
      'WEAK_PASSWORD',
    );
  }

  const resetRow = await findValidResetTokenRow(resetToken);
  const passwordHash = await hashPassword(newPassword);
  await persistNewPasswordAndRevokeSessions(resetRow.value, resetRow.id, passwordHash);
  return { status: 'password_reset' };
}

async function findValidResetTokenRow(resetToken: string): Promise<VerificationRow> {
  const pool = getDatabasePool();
  const resetIdentifier = `pwd-reset:${hashRecoveryResetToken(resetToken)}`;
  const [rows] = await pool.execute<VerificationRow[]>(
    `SELECT id, identifier, value, expiresAt <= UTC_TIMESTAMP() AS isExpired
     FROM verification WHERE identifier = ? LIMIT 1`,
    [resetIdentifier],
  );
  const row = rows[0];
  if (!row || Boolean(row.isExpired)) {
    if (row) await pool.execute('DELETE FROM verification WHERE id = ?', [row.id]);
    throw new CustomerAuthError(
      'O tempo para redefinir a senha expirou. Solicite um novo código.',
      400,
      'RESET_TOKEN_EXPIRED',
    );
  }
  return row;
}

async function persistNewPasswordAndRevokeSessions(
  userId: string,
  verificationId: string,
  passwordHash: string,
): Promise<void> {
  const connection = await getDatabasePool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE account
       SET password = ?, updatedAt = UTC_TIMESTAMP()
       WHERE userId = ? AND providerId = 'credential'`,
      [passwordHash, userId],
    );
    await connection.execute('DELETE FROM verification WHERE id = ?', [verificationId]);
    await connection.execute('DELETE FROM session WHERE userId = ?', [userId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
