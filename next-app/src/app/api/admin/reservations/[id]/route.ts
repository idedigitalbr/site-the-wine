import { NextResponse } from 'next/server';
import { adminReservationStatusSchema } from '@/modules/admin/schemas/admin-schema';
import { changeAdminReservationStatus } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

type RouteContext = { params: Promise<{ id: string }> };

function parseReservationId(rawId: string): number {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) throw new Error('Invalid reservation id');
  return id;
}

function reservationUpdateError(error: unknown): NextResponse {
  let message = '';
  if (error instanceof Error) message = error.message;
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (message === 'Invalid reservation id') return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  if (message === 'Reservation not found') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (message.startsWith('Invalid reservation transition')) return NextResponse.json({ error: 'invalid_transition' }, { status: 409 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  console.error('Admin reservation update failed', error);
  return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const { id: rawId } = await context.params;
    const id = parseReservationId(rawId);
    const parsed = adminReservationStatusSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    await changeAdminReservationStatus(id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return reservationUpdateError(error);
  }
}
