import { NextResponse } from 'next/server';
import { restoreSystemEmailTemplate } from '@/server/system/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

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
    await restoreSystemEmailTemplate(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof Error && error.message === 'Email template not found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    console.error('Admin email template restore failed', error);
    return NextResponse.json({ error: 'system_unavailable' }, { status: 503 });
  }
}
