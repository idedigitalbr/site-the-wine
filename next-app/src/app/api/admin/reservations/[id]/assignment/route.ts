import { NextResponse } from 'next/server';
import { adminReservationTablesSchema } from '@/modules/admin/schemas/admin-schema';
import { changeReservationTables, loadReservationAssignment } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

type RouteContext = { params: Promise<{ id: string }> };

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function assignmentError(error: unknown): NextResponse {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (error instanceof Error && error.message === 'Reservation not found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (error instanceof Error && ['Invalid reservation tables', 'Reservation tables locked', 'Reservation tables cannot be combined', 'Reservation tables combination not configured', 'Reservation tables capacity minimum not met', 'Reservation tables capacity exceeded', 'Reservation tables unavailable', 'Reservation tables blocked'].includes(error.message)) {
    return NextResponse.json({ error: 'tables_unavailable' }, { status: 409 });
  }
  console.error('Admin reservation table assignment failed', error);
  return NextResponse.json({ error: 'assignment_unavailable' }, { status: 503 });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    return NextResponse.json(await loadReservationAssignment(id));
  } catch (error) {
    return assignmentError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const parsed = adminReservationTablesSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_tables' }, { status: 400 });
    await changeReservationTables(id, parsed.data.tableIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return assignmentError(error);
  }
}
