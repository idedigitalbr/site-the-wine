import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import { defaultReservationWhatsappNumber } from '../application/ports';
import type {
  AdminSystem,
  PublicReservationSettings,
  SaveSmtpSettingsInput,
  SmtpSecurity,
  SmtpTestStatus,
  SystemEmailTemplate,
  SystemRepository,
  SystemSmtpSettings,
  UpdateEmailTemplateInput,
} from '../application/ports';

type SmtpValues = {
  enabled: number;
  host: string;
  port: number;
  security: string;
  username: string;
  passwordConfigured: number;
  fromEmail: string;
  fromName: string;
  lastTestStatus: string;
  lastTestedAt: string | null;
};

type SmtpRow = RowDataPacket & SmtpValues;

type TemplateRow = RowDataPacket & {
  id: number;
  templateKey: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  variables: string | string[];
  active: number;
  updatedAt: string | null;
};

type ReservationSettingsRow = RowDataPacket & {
  publicReservationEnabled: number | boolean;
  reservationWhatsappNumber: string | null;
};

const defaultSmtpRow: SmtpValues = {
  enabled: 0,
  host: '',
  port: 587,
  security: 'starttls',
  username: '',
  passwordConfigured: 0,
  fromEmail: '',
  fromName: 'The Wine Experience',
  lastTestStatus: 'not_tested',
  lastTestedAt: null,
};

function encryptionKey(): Buffer {
  const value = process.env.SYSTEM_CONFIG_ENCRYPTION_KEY?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!value) throw new Error('System configuration encryption key is not configured');
  return createHash('sha256').update(value).digest();
}

function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

function mapSmtp(row: SmtpRow | undefined): SystemSmtpSettings {
  const source = row ?? defaultSmtpRow;
  return {
    enabled: Boolean(source.enabled),
    host: source.host,
    port: Number(source.port),
    security: source.security as SmtpSecurity,
    username: source.username,
    fromEmail: source.fromEmail,
    fromName: source.fromName,
    passwordConfigured: Boolean(source.passwordConfigured),
    lastTestStatus: source.lastTestStatus as SmtpTestStatus,
    lastTestedAt: source.lastTestedAt,
  };
}

function mapTemplate(row: TemplateRow): SystemEmailTemplate {
  const parsedVariables = typeof row.variables === 'string' ? JSON.parse(row.variables) as string[] : row.variables;
  return {
    id: Number(row.id),
    key: row.templateKey,
    name: row.name,
    description: row.description,
    subject: row.subject,
    body: row.body,
    variables: parsedVariables,
    active: Boolean(row.active),
    updatedAt: row.updatedAt,
  };
}

function assertAffectedRows(result: ResultSetHeader, message: string): void {
  if (result.affectedRows === 0) throw new Error(message);
}

export class MysqlSystemRepository implements SystemRepository {
  async getSystem(): Promise<AdminSystem> {
    const pool = getDatabasePool();
    const [smtpResult, templateResult, reservationSettingsResult] = await Promise.all([
      pool.execute<SmtpRow[]>(`
        SELECT enabled, host, port, security, username,
               password_ciphertext IS NOT NULL AS passwordConfigured,
               from_email AS fromEmail, from_name AS fromName,
               last_test_status AS lastTestStatus,
               DATE_FORMAT(last_tested_at, '%Y-%m-%d %H:%i') AS lastTestedAt
        FROM system_smtp_settings WHERE id = 1 LIMIT 1
      `),
      pool.execute<TemplateRow[]>(`
        SELECT id, template_key AS templateKey, name, description, subject, body,
               variables, active,
               DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i') AS updatedAt
        FROM system_email_templates
        ORDER BY sort_order, id
      `),
      pool.execute<ReservationSettingsRow[]>(`
        SELECT public_reservation_enabled AS publicReservationEnabled,
               reservation_whatsapp_number AS reservationWhatsappNumber
        FROM system_reservation_settings WHERE id = 1 LIMIT 1
      `),
    ]);
    return {
      smtp: mapSmtp(smtpResult[0][0]),
      templates: templateResult[0].map(mapTemplate),
      publicReservationEnabled: Boolean(reservationSettingsResult[0][0]?.publicReservationEnabled ?? true),
      reservationWhatsappNumber: reservationSettingsResult[0][0]?.reservationWhatsappNumber ?? defaultReservationWhatsappNumber,
    };
  }

  async getPublicReservationSettings(): Promise<PublicReservationSettings> {
    const [rows] = await getDatabasePool().execute<ReservationSettingsRow[]>(`
      SELECT public_reservation_enabled AS publicReservationEnabled,
             reservation_whatsapp_number AS reservationWhatsappNumber
      FROM system_reservation_settings WHERE id = 1 LIMIT 1
    `);
    return {
      publicReservationEnabled: Boolean(rows[0]?.publicReservationEnabled ?? true),
      reservationWhatsappNumber: rows[0]?.reservationWhatsappNumber ?? defaultReservationWhatsappNumber,
    };
  }

  async savePublicReservationEnabled(enabled: boolean): Promise<void> {
    await getDatabasePool().execute(
      `INSERT INTO system_reservation_settings (id, public_reservation_enabled)
       VALUES (1, ?)
       ON DUPLICATE KEY UPDATE public_reservation_enabled = VALUES(public_reservation_enabled)`,
      [enabled],
    );
  }

  async saveReservationWhatsappNumber(number: string): Promise<void> {
    await getDatabasePool().execute(
      `INSERT INTO system_reservation_settings (id, reservation_whatsapp_number)
       VALUES (1, ?)
       ON DUPLICATE KEY UPDATE reservation_whatsapp_number = VALUES(reservation_whatsapp_number)`,
      [number],
    );
  }

  async saveSmtpSettings(input: SaveSmtpSettingsInput): Promise<void> {
    const passwordCiphertext = input.password.trim() ? encryptSecret(input.password.trim()) : null;
    await getDatabasePool().execute(
      `INSERT INTO system_smtp_settings
         (id, enabled, host, port, security, username, password_ciphertext, from_email, from_name)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         enabled = VALUES(enabled), host = VALUES(host), port = VALUES(port),
         security = VALUES(security), username = VALUES(username),
         password_ciphertext = IF(VALUES(password_ciphertext) IS NULL, password_ciphertext, VALUES(password_ciphertext)),
         from_email = VALUES(from_email), from_name = VALUES(from_name),
         last_test_status = 'not_tested', last_tested_at = NULL`,
      [input.enabled, input.host, input.port, input.security, input.username, passwordCiphertext, input.fromEmail, input.fromName],
    );
  }

  async recordSmtpTest(status: Exclude<SmtpTestStatus, 'not_tested'>): Promise<void> {
    await getDatabasePool().execute(
      `UPDATE system_smtp_settings
       SET last_test_status = ?, last_tested_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [status],
    );
  }

  async updateEmailTemplate(input: UpdateEmailTemplateInput): Promise<void> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `UPDATE system_email_templates
       SET subject = ?, body = ?, active = ?
       WHERE id = ?`,
      [input.subject, input.body, input.active, input.id],
    );
    assertAffectedRows(result, 'Email template not found');
  }

  async restoreEmailTemplate(id: number): Promise<void> {
    const [result] = await getDatabasePool().execute<ResultSetHeader>(
      `UPDATE system_email_templates
       SET subject = default_subject, body = default_body, active = 1
       WHERE id = ?`,
      [id],
    );
    assertAffectedRows(result, 'Email template not found');
  }
}
