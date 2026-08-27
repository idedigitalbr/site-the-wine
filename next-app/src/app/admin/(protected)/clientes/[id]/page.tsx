import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminCustomerProfileView } from '@/components/admin/AdminCustomerProfileView';
import { loadAdminCustomerProfile } from '@/server/admin/composition';

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: 'Perfil do cliente | The Wine Operations' };

export default async function AdminCustomerProfilePage({ params }: PageProps) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const profile = await loadAdminCustomerProfile(id);
  if (!profile) notFound();
  return <AdminCustomerProfileView profile={profile} />;
}
