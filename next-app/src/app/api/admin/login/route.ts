import { NextResponse } from 'next/server';
import { adminLoginSchema } from '@/modules/admin/schemas/admin-schema';
import {
  attachAdminSession,
  credentialsAreValid,
  isAdminConfigured,
} from '@/server/admin/auth';

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'admin_not_configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success || !credentialsAreValid(parsed.data.email, parsed.data.password)) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  return attachAdminSession(
    NextResponse.json({ ok: true }),
    parsed.data.email,
  );
}
