import type { Metadata } from 'next';
import { AdminReservationsView } from '@/components/admin/AdminReservationsView';
import { loadAdminReservations, loadAdminWaitlist } from '@/server/admin/composition';

export const metadata: Metadata = { title: 'Reservas | The Wine Operations' };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminReservationsPage() {
  const date = todayIso();
  const [reservations, waitlist] = await Promise.all([loadAdminReservations(date), loadAdminWaitlist(date)]);
  return <AdminReservationsView initialDate={date} initialReservations={reservations} initialWaitlist={waitlist} />;
}
