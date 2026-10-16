import { NextRequest, NextResponse } from 'next/server';
import { loadAvailability, loadAvailabilitySlots, loadGeneralAvailability } from '@/server/reservations/availability';
import { availabilityQuerySchema } from '@/modules/reservations/schemas/availability-schema';
import { getReservationSessionTokenHash } from '@/server/reservations/session';

async function loadAvailabilityResult(parsed: ReturnType<typeof availabilityQuerySchema.parse>, sessionTokenHash: string | null) {
  if (parsed.mode === 'general') {
    return loadGeneralAvailability({
      reservationDate: parsed.date,
      durationMinutes: parsed.duration,
    }, sessionTokenHash);
  }

  if (!parsed.time) {
    return loadAvailabilitySlots({
      reservationDate: parsed.date,
      guestCount: parsed.guests,
      durationMinutes: parsed.duration,
    }, sessionTokenHash);
  }

  return loadAvailability({
    reservationDate: parsed.date,
    startTime: parsed.time,
    guestCount: parsed.guests,
    durationMinutes: parsed.duration,
  }, sessionTokenHash);
}

async function loadDevelopmentFallback(request: NextRequest, allowFallback: boolean): Promise<NextResponse | null> {
  if (!allowFallback) return null;
  if (process.env.NODE_ENV === 'production') return null;
  try {
    const fallbackUrl = new URL('https://thewineexperience.com.br/api/reservations/availability');
    request.nextUrl.searchParams.forEach((value, key) => fallbackUrl.searchParams.set(key, value));
    const response = await fetch(fallbackUrl.toString(), { cache: 'no-store' });
    if (response.ok) return NextResponse.json(await response.json());
  } catch {
    return null;
  }
  return null;
}

function isInvalidAvailabilityQuery(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Invalid availability query');
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
    const result = await loadAvailabilityResult(parsed.data, sessionTokenHash);
    return NextResponse.json(result);
  } catch (error) {
    if (isInvalidAvailabilityQuery(error)) {
      return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
    }

    const fallback = await loadDevelopmentFallback(request, parsed.data.mode !== 'general');
    if (fallback) return fallback;

    console.error('Availability query failed', error);
    return NextResponse.json({ error: 'availability_unavailable' }, { status: 503 });
  }
}
