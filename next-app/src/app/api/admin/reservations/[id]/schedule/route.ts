import { NextResponse } from 'next/server';
import { adminReservationScheduleSchema } from '@/modules/admin/schemas/admin-schema';
import { changeReservationSchedule } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

type RouteContext = { params: Promise<{ id: string }> };

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function scheduleError(error: unknown): NextResponse {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (error instanceof Error && error.message === 'Reservation not found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (error instanceof Error && ['Reservation schedule is locked', 'Invalid reservation tables', 'Reservation tables cannot be combined', 'Reservation tables capacity exceeded', 'Reservation tables unavailable', 'Reservation tables blocked', 'Reservation state changed'].includes(error.message)) {
    return NextResponse.json({ error: 'schedule_unavailable' }, { status: 409 });
  }
  console.error('Admin reservation schedule update failed', error);
  return NextResponse.json({ error: 'schedule_unavailable' }, { status: 503 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const id = parseId((await context.params).id);
    if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const parsed = adminReservationScheduleSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_schedule' }, { status: 400 });
    await changeReservationSchedule(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    return scheduleError(error);
  }
}
