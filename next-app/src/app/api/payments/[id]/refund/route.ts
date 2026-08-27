import { NextResponse } from 'next/server';
import { refundPaymentSchema } from '@/modules/payments/schemas/payment-schema';
import { PaymentGatewayDisabledError, PaymentGatewayNotConfiguredError, PaymentGatewayRequestError } from '@/modules/payments/application/payment-errors';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';
import { refundMercadoPagoPayment } from '@/server/payments/composition';

type RouteContext = { params: Promise<{ id: string }> };

function parsePaymentId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function paymentGatewayErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof PaymentGatewayDisabledError) return NextResponse.json({ error: 'payment_mock_only' }, { status: 409 });
  if (error instanceof PaymentGatewayNotConfiguredError || error instanceof PaymentGatewayRequestError) {
    return NextResponse.json({ error: error instanceof PaymentGatewayNotConfiguredError ? 'payment_provider_not_configured' : 'payment_provider_unavailable' }, { status: error instanceof PaymentGatewayNotConfiguredError ? 503 : 502 });
  }
  return null;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const gatewayError = paymentGatewayErrorResponse(error);
  if (gatewayError) return gatewayError;
  if (error instanceof Error) {
    const knownError = {
      'Payment not found': { error: 'not_found', status: 404 },
      'Payment has no gateway id': { error: 'invalid_refund', status: 409 },
      'Invalid refund amount': { error: 'invalid_refund', status: 409 },
    }[error.message];
    if (knownError) return NextResponse.json({ error: knownError.error }, { status: knownError.status });
  }
  console.error('Payment refund failed', error);
  return NextResponse.json({ error: 'refund_unavailable' }, { status: 503 });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await requireAdminSession();
    const id = parsePaymentId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const parsed = refundPaymentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_refund', fields: parsed.error.issues.map((issue) => issue.path.join('.')) }, { status: 400 });
    const result = await refundMercadoPagoPayment({ paymentId: id, ...parsed.data }, session.email);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return errorResponse(error);
  }
}
