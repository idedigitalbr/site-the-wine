import { NextResponse } from 'next/server';
import { submitPublicReservation } from '@/server/reservations/create-public-reservation';
import { publicReservationSchema } from '@/modules/reservations/schemas/public-reservation-schema';
import { getReservationSessionTokenHash } from '@/server/reservations/session';

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function createReservationResponse(input: Parameters<typeof submitPublicReservation>[0], sessionTokenHash: string): Promise<NextResponse> {
  try {
    const result = await submitPublicReservation(input, sessionTokenHash);
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

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === null) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const parsed = publicReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: 'invalid_input',
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    }, { status: 400 });
  }

  const sessionTokenHash = await getReservationSessionTokenHash();
  if (!sessionTokenHash) {
    return NextResponse.json({ error: 'hold_required' }, { status: 409 });
  }

  return createReservationResponse(parsed.data, sessionTokenHash);
}
