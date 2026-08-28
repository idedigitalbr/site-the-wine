import { NextResponse } from 'next/server';
import { testSystemSmtpSettings } from '@/server/system/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

export async function POST() {
  try {
    await requireAdminSession();
    return NextResponse.json(await testSystemSmtpSettings());
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof Error && error.message === 'SMTP settings incomplete') {
      return NextResponse.json({ error: 'incomplete_settings' }, { status: 400 });
    }
    console.error('Admin SMTP mock test failed', error);
    return NextResponse.json({ error: 'system_unavailable' }, { status: 503 });
  }
}
