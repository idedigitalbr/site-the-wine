import { NextResponse } from 'next/server';
import { createPaymentSchema } from '@/modules/payments/schemas/payment-schema';
import { createMercadoPagoPayment } from '@/server/payments/composition';
import { PaymentGatewayDisabledError, PaymentGatewayNotConfiguredError, PaymentGatewayRequestError } from '@/modules/payments/application/payment-errors';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

function paymentGatewayErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof PaymentGatewayDisabledError) return NextResponse.json({ error: 'payment_mock_only' }, { status: 409 });
  if (error instanceof PaymentGatewayNotConfiguredError) return NextResponse.json({ error: 'payment_provider_not_configured' }, { status: 503 });
  if (error instanceof PaymentGatewayRequestError) return NextResponse.json({ error: 'payment_provider_unavailable' }, { status: 502 });
  return null;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const gatewayError = paymentGatewayErrorResponse(error);
  if (gatewayError) return gatewayError;
  if (error instanceof Error && error.message === 'Reservation not found') return NextResponse.json({ error: 'reservation_not_found' }, { status: 404 });
  if (error instanceof Error && error.message.startsWith('Invalid')) return NextResponse.json({ error: 'invalid_payment' }, { status: 400 });
  console.error('Payment creation failed', error);
  return NextResponse.json({ error: 'payment_unavailable' }, { status: 503 });
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_payment', fields: parsed.error.issues.map((issue) => issue.path.join('.')) }, { status: 400 });
    const result = await createMercadoPagoPayment(parsed.data);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return errorResponse(error);
  }
}
