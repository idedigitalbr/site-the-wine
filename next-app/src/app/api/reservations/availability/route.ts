import { NextRequest, NextResponse } from 'next/server';
import { loadAvailability, loadAvailabilitySlots } from '@/server/reservations/availability';
import { availabilityQuerySchema, type AvailabilityQueryInput } from '@/modules/reservations/schemas/availability-schema';
import { getReservationSessionTokenHash } from '@/server/reservations/session';

async function loadAvailabilityForQuery(query: AvailabilityQueryInput, sessionTokenHash: string | null) {
  if (query.time) {
    return loadAvailability({
      reservationDate: query.date,
      startTime: query.time,
      guestCount: query.guests,
      durationMinutes: query.duration,
    }, sessionTokenHash);
  }

  return loadAvailabilitySlots({
    reservationDate: query.date,
    guestCount: query.guests,
    durationMinutes: query.duration,
  }, sessionTokenHash);
}

function isInvalidAvailabilityQuery(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Invalid availability query');
}

async function loadDevelopmentFallback(request: NextRequest): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === 'production') return null;

  try {
    const fallbackUrl = new URL('https://thewineexperience.com.br/api/reservations/availability');
    request.nextUrl.searchParams.forEach((value, key) => fallbackUrl.searchParams.set(key, value));
    const response = await fetch(fallbackUrl.toString(), { cache: 'no-store' });
    if (!response.ok) return null;
    return NextResponse.json(await response.json());
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = availabilityQuerySchema.safeParse(rawQuery);

  if (!parsed.success) {
    return NextResponse.json({
      error: 'invalid_query',
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    }, { status: 400 });
  }

  try {
    const sessionTokenHash = await getReservationSessionTokenHash();
    const result = await loadAvailabilityForQuery(parsed.data, sessionTokenHash);
    return NextResponse.json(result);
  } catch (error) {
    if (isInvalidAvailabilityQuery(error)) {
      return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
    }

    const fallback = await loadDevelopmentFallback(request);
    if (fallback) return fallback;

    console.error('Availability query failed', error);
    return NextResponse.json({ error: 'availability_unavailable' }, { status: 503 });
  }
}
