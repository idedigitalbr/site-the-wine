import type { Metadata } from 'next';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { loadAdminDashboard } from '@/server/admin/composition';

export const metadata: Metadata = { title: 'Dashboard | The Wine Operations' };

function todayIso(): string {
  const timeZone = process.env.RESERVATION_ESTABLISHMENT_TIMEZONE?.trim() || 'America/Sao_Paulo';
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

export default async function AdminDashboardPage() {
  const date = todayIso();
  const dashboard = await loadAdminDashboard({ fromDate: date, toDate: date, page: 1, pageSize: 9 });
  return <AdminDashboardView initialDashboard={dashboard} />;
}
