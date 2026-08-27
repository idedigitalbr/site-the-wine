import type { Metadata } from 'next';
import { AdminNotificationsView } from '@/components/admin/AdminNotificationsView';
import { listNotifications } from '@/server/notifications/composition';

export const metadata: Metadata = { title: 'Notificações | The Wine Operations' };

export default async function AdminNotificationsPage() {
  return <AdminNotificationsView initialNotifications={await listNotifications(100)} />;
}
