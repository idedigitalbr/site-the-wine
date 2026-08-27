import type { Metadata } from 'next';
import { AdminCustomersView } from '@/components/admin/AdminCustomersView';
import { loadAdminCustomers } from '@/server/admin/composition';

export const metadata: Metadata = { title: 'Clientes | The Wine Operations' };

export default async function AdminCustomersPage() {
  return <AdminCustomersView initialCustomers={await loadAdminCustomers()} />;
}
