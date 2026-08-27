import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { getAdminSession } from '@/server/admin/auth';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  if (!(await getAdminSession())) redirect('/admin/login');
  return <AdminShell>{children}</AdminShell>;
}
