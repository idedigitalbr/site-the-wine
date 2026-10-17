import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type EncryptedReplayPayload = {
  ciphertext: string;
  nonce: string;
  authTag: string;
  keyVersion: string;
  expiresAt: string;
};

function assertKey(key: Buffer): void {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('Reservation replay encryption key must be 32 bytes');
}

export function configuredReplayKey(environment: NodeJS.ProcessEnv = process.env): Buffer {
  const encoded = environment.RESERVATION_REPLAY_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error('Reservation replay encryption key is not configured');
  const key = Buffer.from(encoded, 'base64');
  assertKey(key);
  return key;
}

export function encryptReplayPayload(
  payload: Record<string, unknown>,
  key: Buffer,
  keyVersion = process.env.RESERVATION_REPLAY_KEY_VERSION?.trim() || 'v1',
  now = new Date(),
): EncryptedReplayPayload {
  assertKey(key);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    nonce: nonce.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    keyVersion,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function decryptReplayPayload<T extends Record<string, unknown>>(
  encrypted: EncryptedReplayPayload,
  key: Buffer,
  now = new Date(),
): T {
  assertKey(key);
  const expiresAt = Date.parse(encrypted.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
    throw new Error('Reservation replay expired');
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.nonce, 'base64'));
    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(plaintext) as T;
  } catch {
    throw new Error('Reservation replay payload authentication failed');
  }
}
