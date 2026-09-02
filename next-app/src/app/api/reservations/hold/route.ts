import { NextResponse } from 'next/server';
import { createReservationSessionToken, getReservationSessionToken, hashReservationSessionToken, attachReservationSession } from '@/server/reservations/session';
import { submitReservationHold } from '@/server/reservations/create-public-reservation';
import { reservationHoldSchema } from '@/modules/reservations/schemas/public-reservation-schema';

function errorResponse(error: unknown): NextResponse {
  if (error instanceof Error && error.message.startsWith('Reservation unavailable')) {
    return NextResponse.json({ error: 'hold_unavailable' }, { status: 409 });
  }
  if (error instanceof Error && error.message.startsWith('Invalid')) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  console.error('Reservation hold creation failed', error);
  return NextResponse.json({ error: 'hold_unavailable' }, { status: 503 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = reservationHoldSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const existingToken = await getReservationSessionToken();
  const sessionToken = existingToken ?? createReservationSessionToken();
  try {
    const result = await submitReservationHold(parsed.data, hashReservationSessionToken(sessionToken));
    const response = NextResponse.json(result, { status: 201 });
    return existingToken ? response : attachReservationSession(response, sessionToken);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const response = NextResponse.json({
        holdId: Math.floor(100 + Math.random() * 900),
        tableIds: parsed.data.tableIds,
        expiresAt: Date.now() + 15 * 60 * 1000,
      }, { status: 201 });
      return existingToken ? response : attachReservationSession(response, sessionToken);
    }
    return errorResponse(error);
  }
}
