import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminWalkInSchema } from '@/modules/admin/schemas/admin-schema';
import { createAdminWalkIn } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

function createWalkInCode(): string {
  return `WI-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const parsed = adminWalkInSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_walk_in' }, { status: 400 });
    const reservationId = await createAdminWalkIn({
      publicCode: createWalkInCode(),
      reservationDate: parsed.data.date,
      startTime: parsed.data.time,
      durationMinutes: parsed.data.duration,
      guestCount: parsed.data.guests,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      notes: parsed.data.notes,
      tableIds: parsed.data.tableIds,
    });
    return NextResponse.json({ reservationId }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    if (error instanceof Error && ['Invalid walk-in tables', 'Walk-in tables unavailable'].includes(error.message)) {
      return NextResponse.json({ error: 'tables_unavailable' }, { status: 409 });
    }
    console.error('Admin walk-in creation failed', error);
    return NextResponse.json({ error: 'walk_in_unavailable' }, { status: 503 });
  }
}
