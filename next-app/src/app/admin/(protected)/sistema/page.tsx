import type { Metadata } from 'next';
import { AdminSystemView } from '@/components/admin/AdminSystemView';
import { loadSystemConfiguration } from '@/server/system/composition';

export const metadata: Metadata = { title: 'Sistema | The Wine Operations' };

export default async function AdminSystemPage() {
  return <AdminSystemView initialSystem={await loadSystemConfiguration()} />;
}
