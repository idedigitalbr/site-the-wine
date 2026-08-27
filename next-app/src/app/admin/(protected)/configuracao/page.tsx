import type { Metadata } from 'next';
import { AdminConfigurationView } from '@/components/admin/AdminConfigurationView';
import { loadAdminConfiguration } from '@/server/admin/composition';

export const metadata: Metadata = { title: 'Configuração | The Wine Operations' };

export default async function AdminConfigurationPage() {
  return <AdminConfigurationView initialConfiguration={await loadAdminConfiguration()} />;
}
