import { NextResponse } from 'next/server';
import { loadReservationTimeline } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

type RouteContext = { params: Promise<{ id: string }> };

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    return NextResponse.json({ timeline: await loadReservationTimeline(id) });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error('Admin reservation timeline failed', error);
    return NextResponse.json({ error: 'timeline_unavailable' }, { status: 503 });
  }
}
