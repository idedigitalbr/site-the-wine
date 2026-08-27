import { NextRequest, NextResponse } from 'next/server';
import { loadAdminAnalytics } from '@/server/admin/composition';
import { adminAnalyticsQuerySchema } from '@/modules/admin/schemas/admin-schema';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const to = request.nextUrl.searchParams.get('to') ?? todayIso();
    const from = request.nextUrl.searchParams.get('from') ?? addDays(to, -6);
    const parsed = adminAnalyticsQuerySchema.safeParse({ from, to });
    if (!parsed.success) return NextResponse.json({ error: 'invalid_period' }, { status: 400 });
    return NextResponse.json(await loadAdminAnalytics(parsed.data.from, parsed.data.to));
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error('Admin analytics failed', error);
    return NextResponse.json({ error: 'analytics_unavailable' }, { status: 503 });
  }
}
