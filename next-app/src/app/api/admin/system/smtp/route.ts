import { NextResponse } from 'next/server';
import { saveSmtpSettingsSchema } from '@/modules/system/schemas/system-schema';
import { saveSystemSmtpSettings } from '@/server/system/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    const parsed = saveSmtpSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input', fields: parsed.error.issues.map((issue) => issue.path.join('.')) }, { status: 400 });
    }
    await saveSystemSmtpSettings(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    console.error('Admin SMTP configuration save failed', error);
    return NextResponse.json({ error: 'system_unavailable' }, { status: 503 });
  }
}
