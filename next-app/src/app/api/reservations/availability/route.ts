import { NextRequest, NextResponse } from 'next/server';
import { loadAvailability, loadAvailabilitySlots } from '@/server/reservations/availability';
import { availabilityQuerySchema } from '@/modules/reservations/schemas/availability-schema';
import { getReservationSessionTokenHash } from '@/server/reservations/session';

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
    if (!parsed.data.time) {
      const result = await loadAvailabilitySlots({
        reservationDate: parsed.data.date,
        guestCount: parsed.data.guests,
        durationMinutes: parsed.data.duration,
      }, sessionTokenHash);
      return NextResponse.json(result);
    }

    const result = await loadAvailability({
      reservationDate: parsed.data.date,
      startTime: parsed.data.time,
      guestCount: parsed.data.guests,
      durationMinutes: parsed.data.duration,
    }, sessionTokenHash);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid availability query')) {
      return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
    }

    if (process.env.NODE_ENV !== 'production') {
      try {
        const fallbackUrl = new URL('https://thewineexperience.com.br/api/reservations/availability');
        request.nextUrl.searchParams.forEach((val, key) => fallbackUrl.searchParams.set(key, val));
        const res = await fetch(fallbackUrl.toString(), { cache: 'no-store' });
        if (res.ok) {
          return NextResponse.json(await res.json());
        }
      } catch {
        // Fall through to error
      }
    }

    console.error('Availability query failed', error);
    return NextResponse.json({ error: 'availability_unavailable' }, { status: 503 });
  }
}
