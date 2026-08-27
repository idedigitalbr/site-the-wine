import { NextRequest, NextResponse } from 'next/server';
import { loadAvailability, loadAvailabilitySlots } from '@/server/reservations/availability';
import { availabilityQuerySchema } from '@/modules/reservations/schemas/availability-schema';

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
    if (!parsed.data.time) {
      const result = await loadAvailabilitySlots({
        reservationDate: parsed.data.date,
        guestCount: parsed.data.guests,
        durationMinutes: parsed.data.duration,
      });
      return NextResponse.json(result);
    }

    const result = await loadAvailability({
      reservationDate: parsed.data.date,
      startTime: parsed.data.time,
      guestCount: parsed.data.guests,
      durationMinutes: parsed.data.duration,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid availability query')) {
      return NextResponse.json({ error: 'invalid_query' }, { status: 400 });
    }

    console.error('Availability query failed', error);
    return NextResponse.json({ error: 'availability_unavailable' }, { status: 503 });
  }
}
