import { NextResponse } from 'next/server';
import { publicReservationPortalSchema } from '@/modules/reservations/schemas/portal-reservation-schema';
import { cancelPublicReservation } from '@/server/reservations/portal';

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof Error && error.message === 'Reservation portal not found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (error instanceof Error && (
    error.message.startsWith('Invalid reservation transition')
    || error.message === 'Reservation can no longer be cancelled'
  )) {
    return NextResponse.json({ error: 'not_cancellable' }, { status: 409 });
  }

  console.error('Public reservation cancellation failed', error);
  return NextResponse.json({ error: 'reservation_unavailable' }, { status: 503 });
}

async function handleCancellation(secureToken: string): Promise<NextResponse> {
  try {
    const reservation = await cancelPublicReservation(secureToken);
    return NextResponse.json({ reservation });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const body = await readJson(request);
  if (body === null) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });

  const parsed = publicReservationPortalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  return handleCancellation(parsed.data.secureToken);
}
