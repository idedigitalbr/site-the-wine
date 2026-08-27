import { NextRequest, NextResponse } from 'next/server';
import { adminDateSchema } from '@/modules/admin/schemas/admin-schema';
import { loadAdminDashboard } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const date = request.nextUrl.searchParams.get('date') ?? todayIso();
    const parsed = adminDateSchema.safeParse(date);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    return NextResponse.json(await loadAdminDashboard(parsed.data));
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error('Admin dashboard failed', error);
    return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
  }
}
