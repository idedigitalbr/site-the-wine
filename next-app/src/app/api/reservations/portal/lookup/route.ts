import { NextResponse } from 'next/server';
import { publicReservationLookupSchema } from '@/modules/reservations/schemas/portal-reservation-schema';
import { getPublicReservationByCode } from '@/server/reservations/portal';

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === null) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const parsed = publicReservationLookupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: 'invalid_input',
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    }, { status: 400 });
  }

  try {
    const reservation = await getPublicReservationByCode(parsed.data.publicCode);
    return NextResponse.json({ reservation });
  } catch (error) {
    if (error instanceof Error && error.message === 'Reservation portal not found') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    console.error('Public reservation lookup failed', error);
    return NextResponse.json({ error: 'reservation_unavailable' }, { status: 503 });
  }
}
