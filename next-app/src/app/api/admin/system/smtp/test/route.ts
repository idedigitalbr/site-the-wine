import { NextResponse } from 'next/server';
import { testSmtpSettingsSchema } from '@/modules/system/schemas/system-schema';
import { testSystemSmtpSettings } from '@/server/system/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const parsed = testSmtpSettingsSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_test_recipient' }, { status: 400 });
    return NextResponse.json(await testSystemSmtpSettings(parsed.data.recipientEmail));
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    if (error instanceof Error && error.message === 'SMTP settings incomplete') {
      return NextResponse.json({ error: 'incomplete_settings' }, { status: 400 });
    }
    console.error('Admin SMTP mock test failed', error);
    return NextResponse.json({ error: 'system_unavailable' }, { status: 503 });
  }
}
