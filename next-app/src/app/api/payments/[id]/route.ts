import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';
import { getPayment } from '@/server/payments/composition';

type RouteContext = { params: Promise<{ id: string }> };

function parsePaymentId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const id = parsePaymentId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const payment = await getPayment(id);
    return payment ? NextResponse.json({ payment }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error('Payment lookup failed', error);
    return NextResponse.json({ error: 'payment_unavailable' }, { status: 503 });
  }
}
