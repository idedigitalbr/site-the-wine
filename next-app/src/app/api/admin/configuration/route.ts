import { NextResponse } from 'next/server';
import { adminConfigurationCommandSchema } from '@/modules/admin/schemas/admin-schema';
import { loadAdminConfiguration, saveConfiguration } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

export async function GET() {
  try {
    await requireAdminSession();
    return NextResponse.json(await loadAdminConfiguration());
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error('Admin configuration read failed', error);
    return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const parsed = adminConfigurationCommandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input', fields: parsed.error.issues.map((issue) => issue.path.join('.')) }, { status: 400 });
    }
    const id = await saveConfiguration(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    console.error('Admin configuration write failed', error);
    return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
  }
}
