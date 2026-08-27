import { NextRequest, NextResponse } from 'next/server';
import { adminDateSchema } from '@/modules/admin/schemas/admin-schema';
import { loadAdminReservations } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const rawDate = request.nextUrl.searchParams.get('date');
    const date = rawDate ? adminDateSchema.parse(rawDate) : undefined;
    return NextResponse.json({ reservations: await loadAdminReservations(date) });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof Error && error.name === 'ZodError') return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    console.error('Admin reservations failed', error);
    return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
  }
}
