import { NextResponse } from 'next/server';
import { submitPublicReservation } from '@/server/reservations/create-public-reservation';
import { publicReservationSchema } from '@/modules/reservations/schemas/public-reservation-schema';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = publicReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: 'invalid_input',
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    }, { status: 400 });
  }

  try {
    const result = await submitPublicReservation(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Reservation unavailable')) {
      return NextResponse.json({ error: 'reservation_unavailable' }, { status: 409 });
    }

    if (error instanceof Error && error.message.startsWith('Invalid')) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    console.error('Public reservation creation failed', error);
    return NextResponse.json({ error: 'reservation_unavailable' }, { status: 503 });
  }
}
