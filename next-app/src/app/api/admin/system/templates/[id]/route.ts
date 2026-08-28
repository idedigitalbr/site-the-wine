import { NextResponse } from 'next/server';
import { updateEmailTemplateSchema } from '@/modules/system/schemas/system-schema';
import { updateSystemEmailTemplate } from '@/server/system/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

type RouteContext = { params: Promise<{ id: string }> };

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const parsed = updateEmailTemplateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    await updateSystemEmailTemplate({ id, ...parsed.data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    if (error instanceof Error && error.message === 'Email template not found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    console.error('Admin email template update failed', error);
    return NextResponse.json({ error: 'system_unavailable' }, { status: 503 });
  }
}
