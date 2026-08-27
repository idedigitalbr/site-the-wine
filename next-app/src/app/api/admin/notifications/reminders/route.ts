import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';
import { runReservationReminderCycle } from '@/server/notifications/composition';

export async function POST() {
  try {
    await requireAdminSession();
    return NextResponse.json(await runReservationReminderCycle());
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    console.error('Admin reminder cycle failed', error);
    return NextResponse.json({ error: 'reminders_unavailable' }, { status: 503 });
  }
}
