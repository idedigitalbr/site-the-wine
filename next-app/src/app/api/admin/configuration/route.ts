import { NextResponse } from 'next/server';
import { adminConfigurationCommandSchema, adminConfigurationDeleteSchema, adminConfigurationUpdateSchema } from '@/modules/admin/schemas/admin-schema';
import { loadAdminConfiguration, removeConfiguration, saveConfiguration, updateConfiguration } from '@/server/admin/composition';
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
    return configurationErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    const parsed = adminConfigurationUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_input', fields: parsed.error.issues.map((issue) => issue.path.join('.')) }, { status: 400 });
    }
    await updateConfiguration(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return configurationErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminSession();
    const parsed = adminConfigurationDeleteSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    await removeConfiguration(parsed.data.resource, parsed.data.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return configurationErrorResponse(error);
  }
}

function isDuplicateError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';
}

function isReferenceError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && ['ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2'].includes(String(error.code));
}

function configurationErrorResponse(error: unknown): NextResponse {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  if (isDuplicateError(error)) return NextResponse.json({ error: 'duplicate' }, { status: 409 });
  if (isReferenceError(error)) return NextResponse.json({ error: 'invalid_reference' }, { status: 400 });
  if (error instanceof Error && error.message === 'Configuration not found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  console.error('Admin configuration operation failed', error);
  return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
}
