import { NextResponse } from 'next/server';
import { tablePositionSchema } from '@/modules/admin/schemas/admin-schema';
import { saveTablePosition } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

type RouteContext = { params: Promise<{ id: string }> };

function parseTableId(rawId: string): number {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) throw new Error('Invalid table id');
  return id;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (error instanceof Error && error.message === 'Invalid table id') return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  if (error instanceof Error && error.message === 'Table not found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  console.error('Admin table position update failed', error);
  return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const { id: rawId } = await context.params;
    const tableId = parseTableId(rawId);
    const parsed = tablePositionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_position' }, { status: 400 });
    await saveTablePosition(tableId, parsed.data.positionX, parsed.data.positionY);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
