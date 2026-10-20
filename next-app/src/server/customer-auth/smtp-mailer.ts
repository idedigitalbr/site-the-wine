import 'server-only';
import { createDecipheriv, createHash } from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import type { RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';

export type SmtpConnectionConfig = {
  host: string;
  port: number;
  security: 'ssl' | 'starttls' | 'none';
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

type SmtpDbRow = RowDataPacket & {
  enabled: number;
  host: string;
  port: number;
  security: 'ssl' | 'starttls' | 'none';
  username: string;
  passwordCiphertext: string | null;
  fromEmail: string;
  fromName: string;
};

function getSystemEncryptionKey(): Buffer {
  const secret = process.env.SYSTEM_CONFIG_ENCRYPTION_KEY?.trim() || process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) throw new Error('System configuration encryption key is not configured');
  return createHash('sha256').update(secret).digest();
}

function decryptStoredSmtpPassword(ciphertext: string): string {
  const parts = ciphertext.split('.');
  if (parts.length !== 3) throw new Error('Invalid SMTP password ciphertext');
  const iv = Buffer.from(parts[0], 'base64url');
  const tag = Buffer.from(parts[1], 'base64url');
  const encrypted = Buffer.from(parts[2], 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', getSystemEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function parseSmtpSecurity(raw: string): 'ssl' | 'starttls' | 'none' {
  const normalized = raw.toLowerCase();
  if (normalized === 'starttls' || normalized === 'none') return normalized;
  return 'ssl';
}

function resolveEnvSmtpConfig(): SmtpConnectionConfig | null {
  const username = envOrDefault('SMTP_USER', '');
  const password = envOrDefault('SMTP_PASS', '');
  if (!username || !password) return null;
  const port = Number(envOrDefault('SMTP_PORT', '465'));
  return {
    host: envOrDefault('SMTP_HOST', 'smtp.hostinger.com'),
    port: port > 0 ? port : 465,
    security: parseSmtpSecurity(envOrDefault('SMTP_SECURITY', 'ssl')),
    username,
    password,
    fromEmail: envOrDefault('SMTP_FROM_EMAIL', username),
    fromName: envOrDefault('SMTP_FROM_NAME', 'The Wine Experience'),
  };
}

function isSmtpRowComplete(row: SmtpDbRow | undefined): row is SmtpDbRow & { passwordCiphertext: string } {
  if (!row) return false;
  if (!row.enabled || !row.host) return false;
  return typeof row.passwordCiphertext === 'string' && row.passwordCiphertext.length > 0;
}

function mapDbSmtpRow(row: SmtpDbRow & { passwordCiphertext: string }): SmtpConnectionConfig {
  const host = row.host.trim();
  const username = row.username.trim();
  const fromEmail = row.fromEmail.trim();
  return {
    host,
    port: Number(row.port) > 0 ? Number(row.port) : 465,
    security: row.security,
    username,
    password: decryptStoredSmtpPassword(row.passwordCiphertext),
    fromEmail: fromEmail ? fromEmail : username,
    fromName: row.fromName.trim() ? row.fromName.trim() : 'The Wine Experience',
  };
}

export async function loadActiveSmtpConfig(): Promise<SmtpConnectionConfig> {
  const envConfig = resolveEnvSmtpConfig();
  if (envConfig) return envConfig;

  const [rows] = await getDatabasePool().execute<SmtpDbRow[]>(
    `SELECT enabled, host, port, security, username,
            password_ciphertext AS passwordCiphertext,
            from_email AS fromEmail, from_name AS fromName
     FROM system_smtp_settings WHERE id = 1 LIMIT 1`,
  );
  const row = rows[0];
  if (!isSmtpRowComplete(row)) {
    throw new Error('SMTP configuration is not enabled or incomplete');
  }
  return mapDbSmtpRow(row);
}

type SmtpSocket = net.Socket | tls.TLSSocket;

function createLineReader(socket: SmtpSocket) {
  let buffer = '';
  const pending: Array<{ resolve: (line: string) => void; reject: (err: Error) => void }> = [];

  socket.on('data', (chunk: Buffer) => {
    buffer += chunk.toString('utf8');
    drainResponseBuffer();
  });
  socket.on('error', (err: Error) => {
    while (pending.length > 0) pending.shift()?.reject(err);
  });

  function drainResponseBuffer() {
    while (pending.length > 0) {
      const match = buffer.match(/^(?:(?:\d{3}-.*\r?\n)*\d{3} .*\r?\n)/);
      if (!match) return;
      const fullResponse = match[0];
      buffer = buffer.slice(fullResponse.length);
      pending.shift()?.resolve(fullResponse.trim());
    }
  }

  return () => new Promise<string>((resolve, reject) => {
    pending.push({ resolve, reject });
    drainResponseBuffer();
  });
}

async function sendCommand(
  socket: SmtpSocket,
  readResponse: () => Promise<string>,
  command: string,
  expectedPrefix: string,
): Promise<void> {
  socket.write(`${command}\r\n`);
  const response = await readResponse();
  if (!response.startsWith(expectedPrefix)) {
    throw new Error(`SMTP error on ${command.split(' ')[0]}: ${response.slice(0, 80)}`);
  }
}

async function openInitialSocket(config: SmtpConnectionConfig): Promise<SmtpSocket> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => reject(err);
    const socket = config.security === 'ssl'
      ? tls.connect({ host: config.host, port: config.port, servername: config.host }, () => {
        socket.removeListener('error', onError);
        resolve(socket);
      })
      : net.connect({ host: config.host, port: config.port }, () => {
        socket.removeListener('error', onError);
        resolve(socket);
      });
    socket.setTimeout(12_000, () => socket.destroy(new Error('SMTP connection timeout')));
    socket.once('error', onError);
  });
}

async function upgradeToTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({ socket, servername: host }, () => resolve(secureSocket));
    secureSocket.once('error', reject);
  });
}

export async function sendSmtpMail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const config = await loadActiveSmtpConfig();
  let socket = await openInitialSocket(config);
  let readResponse = createLineReader(socket);

  try {
    const greeting = await readResponse();
    if (!greeting.startsWith('220')) throw new Error('Invalid SMTP greeting');
    await sendCommand(socket, readResponse, 'EHLO thewineexperience.com.br', '250');

    if (config.security === 'starttls') {
      await sendCommand(socket, readResponse, 'STARTTLS', '220');
      socket = await upgradeToTls(socket, config.host);
      readResponse = createLineReader(socket);
      await sendCommand(socket, readResponse, 'EHLO thewineexperience.com.br', '250');
    }

    await authenticateSmtp(socket, readResponse, config);
    await transmitMessage(socket, readResponse, config, input);
    socket.write('QUIT\r\n');
  } finally {
    socket.destroy();
  }
}

async function authenticateSmtp(
  socket: SmtpSocket,
  readResponse: () => Promise<string>,
  config: SmtpConnectionConfig,
): Promise<void> {
  await sendCommand(socket, readResponse, 'AUTH LOGIN', '334');
  await sendCommand(socket, readResponse, Buffer.from(config.username, 'utf8').toString('base64'), '334');
  await sendCommand(socket, readResponse, Buffer.from(config.password, 'utf8').toString('base64'), '235');
}

async function transmitMessage(
  socket: SmtpSocket,
  readResponse: () => Promise<string>,
  config: SmtpConnectionConfig,
  input: { to: string; subject: string; text: string; html: string },
): Promise<void> {
  const fromAddress = sanitizeHeaderAddress(config.fromEmail);
  const toAddress = sanitizeHeaderAddress(input.to);
  await sendCommand(socket, readResponse, `MAIL FROM:<${fromAddress}>`, '250');
  await sendCommand(socket, readResponse, `RCPT TO:<${toAddress}>`, '250');
  await sendCommand(socket, readResponse, 'DATA', '354');
  const mime = buildMimePayload(config, toAddress, input.subject, input.text, input.html);
  await sendCommand(socket, readResponse, `${mime}\r\n.`, '250');
}

function sanitizeHeaderAddress(value: string): string {
  return value.replace(/[\r\n<>]/g, '').trim();
}

function buildMimePayload(
  config: SmtpConnectionConfig,
  toAddress: string,
  subject: string,
  text: string,
  html: string,
): string {
  const boundary = 'thewine_recovery_boundary_v1';
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
  const safeFromName = config.fromName.replace(/[\r\n"]/g, '').trim();
  return [
    `From: "${safeFromName}" <${sanitizeHeaderAddress(config.fromEmail)}>`,
    `To: <${toAddress}>`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf8').toString('base64'),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf8').toString('base64'),
    `--${boundary}--`,
  ].join('\r\n');
}
