import { createHmac, timingSafeEqual } from 'node:crypto';

function signatureParts(value: string): Map<string, string> {
  const parts = new Map<string, string>();
  for (const part of value.split(',')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const item = part.slice(separator + 1).trim();
    if (key && item) parts.set(key, item);
  }
  return parts;
}

function safeEqual(first: string, second: string): boolean {
  const firstBuffer = Buffer.from(first, 'utf8');
  const secondBuffer = Buffer.from(second, 'utf8');
  return firstBuffer.length === secondBuffer.length
    && timingSafeEqual(firstBuffer, secondBuffer);
}

function hasRequiredSignatureValues(
  timestamp: number,
  suppliedSignature: string | undefined,
  requestId: string,
  dataId: string,
  secret: string,
): boolean {
  return Number.isInteger(timestamp)
    && Boolean(suppliedSignature)
    && Boolean(requestId)
    && Boolean(dataId)
    && Boolean(secret);
}

export function verifyMercadoPagoWebhookSignature(
  header: string,
  requestId: string,
  dataId: string,
  secret: string,
  nowMs = Date.now(),
  toleranceSeconds = 300,
): boolean {
  const parts = signatureParts(header);
  const timestamp = Number(parts.get('ts'));
  const suppliedSignature = parts.get('v1');
  if (!hasRequiredSignatureValues(timestamp, suppliedSignature, requestId, dataId, secret)) return false;
  const isFresh = Math.abs(Math.floor(nowMs / 1000) - timestamp) <= toleranceSeconds;
  if (!isFresh) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const expectedSignature = createHmac('sha256', secret).update(manifest).digest('hex');
  return safeEqual(expectedSignature, String(suppliedSignature));
}
