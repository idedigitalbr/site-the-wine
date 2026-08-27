import type { Metadata } from 'next';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { loadAdminAnalytics, loadAdminDashboard } from '@/server/admin/composition';

export const metadata: Metadata = { title: 'Dashboard | The Wine Operations' };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateDaysAgo(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export default async function AdminDashboardPage() {
  const toDate = todayIso();
  const [dashboard, analytics] = await Promise.all([
    loadAdminDashboard(toDate),
    loadAdminAnalytics(dateDaysAgo(toDate, 6), toDate),
  ]);
  return <AdminDashboardView dashboard={dashboard} analytics={analytics} />;
}
