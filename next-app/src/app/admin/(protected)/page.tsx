import type { Metadata } from 'next';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { loadAdminDashboard } from '@/server/admin/composition';

export const metadata: Metadata = { title: 'Dashboard | The Wine Operations' };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminDashboardPage() {
  return <AdminDashboardView dashboard={await loadAdminDashboard(todayIso())} />;
}
