import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';
import { listNotifications } from '@/server/notifications/composition';

function requestedLimit(request: Request): number {
  const raw = Number(new URL(request.url).searchParams.get('limit') ?? '100');
  return Number.isFinite(raw) ? raw : 100;
}

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    return NextResponse.json({ notifications: await listNotifications(requestedLimit(request)) });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error('Admin notification lookup failed', error);
    return NextResponse.json({ error: 'notifications_unavailable' }, { status: 503 });
  }
}
