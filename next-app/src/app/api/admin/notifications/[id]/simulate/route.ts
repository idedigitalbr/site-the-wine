import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';
import { simulateNotificationDelivery } from '@/server/notifications/composition';

type RouteContext = { params: Promise<{ id: string }> };

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    await simulateNotificationDelivery(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof Error && error.message === 'Notification not found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (error instanceof Error && error.message.startsWith('Invalid notification transition')) return NextResponse.json({ error: 'invalid_transition' }, { status: 409 });
    console.error('Admin notification simulation failed', error);
    return NextResponse.json({ error: 'notification_unavailable' }, { status: 503 });
  }
}
