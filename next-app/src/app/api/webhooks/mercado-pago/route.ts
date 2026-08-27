import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { verifyMercadoPagoWebhookSignature } from '@/modules/payments/domain/webhook-signature';
import { PaymentGatewayDisabledError, PaymentGatewayNotConfiguredError, PaymentGatewayRequestError } from '@/modules/payments/application/payment-errors';
import { processMercadoPagoWebhook } from '@/server/payments/composition';

type MercadoPagoPayload = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

function webhookSecret(): string | null {
  const value = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  return value || null;
}

function eventDataId(payload: MercadoPagoPayload, request: Request): string | null {
  const value = payload.data?.id ?? new URL(request.url).searchParams.get('data.id');
  return value === undefined || value === null || String(value).trim() === '' ? null : String(value);
}

function payloadEventType(payload: MercadoPagoPayload, request: Request): string {
  return payload.type?.trim() || new URL(request.url).searchParams.get('type')?.trim() || '';
}

function externalEventId(payload: MercadoPagoPayload, requestId: string | null, rawBody: string): string {
  if (payload.id !== undefined) return String(payload.id);
  return createHash('sha256').update(`${requestId ?? ''}:${rawBody}`).digest('hex');
}

function parsePayload(rawBody: string): MercadoPagoPayload | null {
  try {
    return JSON.parse(rawBody) as MercadoPagoPayload;
  } catch {
    return null;
  }
}

function webhookDetails(payload: MercadoPagoPayload, request: Request) {
  const dataId = eventDataId(payload, request);
  const eventType = payloadEventType(payload, request);
  const requestId = request.headers.get('x-request-id');
  const signature = request.headers.get('x-signature');
  if (!dataId || !eventType || !requestId || !signature) return null;
  return { dataId, eventType, requestId, signature };
}

function validatedWebhookInput(payload: MercadoPagoPayload, request: Request, rawBody: string, secret: string) {
  const details = webhookDetails(payload, request);
  if (!details) return null;
  if (!verifyMercadoPagoWebhookSignature(details.signature, details.requestId, details.dataId, secret)) return null;
  return {
    externalEventId: externalEventId(payload, details.requestId, rawBody),
    requestId: details.requestId,
    eventType: details.eventType,
    action: payload.action ?? null,
    signature: details.signature,
    dataId: details.dataId,
    payload: rawBody,
  };
}

function webhookError(error: unknown): NextResponse {
  if (error instanceof PaymentGatewayDisabledError) return NextResponse.json({ error: 'payment_mock_only' }, { status: 503 });
  if (error instanceof PaymentGatewayNotConfiguredError) return NextResponse.json({ error: 'payment_provider_not_configured' }, { status: 503 });
  if (error instanceof PaymentGatewayRequestError) return NextResponse.json({ error: 'payment_provider_unavailable' }, { status: 502 });
  console.error('Mercado Pago webhook failed', error);
  return NextResponse.json({ error: 'webhook_unavailable' }, { status: 503 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const payload = parsePayload(rawBody);
  if (!payload) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  const input = validatedWebhookInput(payload, request, rawBody, secret);
  if (!input) {
    return NextResponse.json({ error: 'invalid_webhook_signature' }, { status: 401 });
  }

  try {
    const result = await processMercadoPagoWebhook(input);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return webhookError(error);
  }
}
