import { NextResponse } from 'next/server';
import { publicWaitlistSchema } from '@/modules/reservations/schemas/public-reservation-schema';
import { submitPublicWaitlist } from '@/server/reservations/join-public-waitlist';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = publicWaitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({
      error: 'invalid_input',
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    }, { status: 400 });
  }

  try {
    return NextResponse.json(await submitPublicWaitlist(parsed.data), { status: 201 });
  } catch (error) {
    console.error('Public waitlist creation failed', error);
    return NextResponse.json({ error: 'waitlist_unavailable' }, { status: 503 });
  }
}
