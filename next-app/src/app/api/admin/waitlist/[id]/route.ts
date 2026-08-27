import { NextResponse } from 'next/server';
import { adminWaitlistStatusSchema } from '@/modules/admin/schemas/admin-schema';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';
import { changeAdminWaitlistStatus } from '@/server/admin/composition';

type RouteContext = { params: Promise<{ id: string }> };

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (error instanceof Error && error.message === 'Waitlist entry not found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (error instanceof Error && error.message.startsWith('Invalid waitlist transition')) return NextResponse.json({ error: 'invalid_transition' }, { status: 409 });
  console.error('Admin waitlist update failed', error);
  return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const parsed = adminWaitlistStatusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    await changeAdminWaitlistStatus(id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return errorResponse(error);
  }
}
