import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { runReservationReminderCycle } from '@/server/notifications/composition';

export const dynamic = 'force-dynamic';

function valuesMatch(expected: string, supplied: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.NOTIFICATION_JOB_SECRET?.trim();
  const supplied = request.headers.get('x-notification-job-secret')?.trim();
  return Boolean(expected && supplied && valuesMatch(expected, supplied));
}

export async function POST(request: Request) {
  if (!process.env.NOTIFICATION_JOB_SECRET?.trim()) {
    return NextResponse.json({ error: 'job_secret_not_configured' }, { status: 503 });
  }
  if (!isAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(await runReservationReminderCycle());
  } catch (error) {
    console.error('Notification reminder job failed', error);
    return NextResponse.json({ error: 'reminders_unavailable' }, { status: 503 });
  }
}
