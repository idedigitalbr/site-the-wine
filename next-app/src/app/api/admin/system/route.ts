import { NextResponse } from 'next/server';
import { loadSystemConfiguration } from '@/server/system/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(await loadSystemConfiguration());
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error('Admin system configuration read failed', error);
    return NextResponse.json({ error: 'system_unavailable' }, { status: 503 });
  }
}
