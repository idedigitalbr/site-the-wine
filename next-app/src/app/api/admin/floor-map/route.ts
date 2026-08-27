import { NextRequest, NextResponse } from 'next/server';
import { floorMapCommandSchema, floorMapQuerySchema } from '@/modules/admin/schemas/admin-schema';
import { loadFloorMap, saveFloorMapCommand } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isInvalidReferenceError(error: unknown): boolean {
  return error instanceof Error && [
    'Invalid combination tables',
    'Invalid blocked period area',
    'Invalid blocked period table',
  ].includes(error.message);
}

function isDuplicateError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  if (isInvalidReferenceError(error)) {
    return NextResponse.json({ error: 'invalid_reference' }, { status: 400 });
  }
  if (isDuplicateError(error)) {
    return NextResponse.json({ error: 'duplicate' }, { status: 409 });
  }
  console.error('Admin floor map operation failed', error);
  return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const raw = {
      date: request.nextUrl.searchParams.get('date') ?? todayIso(),
      time: request.nextUrl.searchParams.get('time') ?? '19:00',
    };
    const parsed = floorMapQuerySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
    return NextResponse.json(await loadFloorMap(parsed.data.date, parsed.data.time));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const parsed = floorMapCommandSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_input', fields: parsed.error.issues.map((issue) => issue.path.join('.')) }, { status: 400 });
    const id = await saveFloorMapCommand(parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
