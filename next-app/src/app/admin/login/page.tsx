import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LockKeyhole, Wine } from 'lucide-react';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { getAdminSession, isAdminConfigured } from '@/server/admin/auth';

export const metadata: Metadata = {
  title: 'Acesso administrativo | The Wine',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin');
  return (
    <main className="reservation-admin-theme flex min-h-screen items-center justify-center bg-background px-5 py-12 font-sans text-foreground">
      <section className="w-full max-w-md rounded-[var(--radius-lg)] border border-border bg-surface p-7 shadow-sm sm:p-10">
        <div className="mb-8 text-center">
          <Wine aria-hidden="true" className="mx-auto text-primary" size={28} strokeWidth={1.5} />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-primary">The Wine Operations</p>
          <h1 className="mt-3 font-display text-4xl text-foreground">Acesso restrito</h1>
          <p className="mt-3 text-sm text-muted">Entre para acompanhar reservas e configurar o salão.</p>
        </div>
        {isAdminConfigured() ? <AdminLoginForm /> : (
          <div className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-status-warning/30 bg-status-warning/10 p-4 text-sm text-status-warning">
            <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
            <span>Configure ADMIN_EMAIL, ADMIN_PASSWORD e ADMIN_SESSION_SECRET no `.env.local` para habilitar o acesso.</span>
          </div>
        )}
      </section>
    </main>
  );
}
