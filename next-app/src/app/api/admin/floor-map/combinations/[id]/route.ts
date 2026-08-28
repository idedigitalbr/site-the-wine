import { NextResponse } from 'next/server';
import { removeFloorMapCombination } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

function combinationId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const id = combinationId((await context.params).id);
    if (id === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    await removeFloorMapCombination(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof Error && error.message === 'Combination not found') {
      return NextResponse.json({ error: 'combination_not_found' }, { status: 404 });
    }
    console.error('Admin floor map combination removal failed', error);
    return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
  }
}
