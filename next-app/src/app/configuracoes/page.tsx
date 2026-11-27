import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import '../../../public/style.css';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import { Header } from '@/components/layout/Header';
import { AccountSettingsProvider } from '@/components/account/settings/AccountSettingsContext';
import { AccountSettingsView } from '@/components/account/settings/AccountSettingsView';
import styles from '@/components/account/settings/AccountSettings.module.css';
import { getCustomerSession } from '@/server/customer-auth/service';
import { getCustomerReservationsPageAccess } from '@/server/reservations/customer-reservations-page-access';

export const metadata: Metadata = {
  title: 'Configurações da conta | The Wine Experience',
  description: 'Gerencie suas informações pessoais, segurança, preferências de notificação e formas de pagamento.',
  alternates: {
    canonical: '/configuracoes',
  },
  robots: { index: false, follow: false },
};

function AccountSettingsFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px] text-[#A6A095]">
      <p>Carregando configurações da conta…</p>
    </div>
  );
}

export default async function AccountSettingsPage() {
  const requestHeaders = new Headers(await headers());
  const request = new Request('http://internal/configuracoes', { headers: requestHeaders });
  const access = await getCustomerReservationsPageAccess(request, getCustomerSession);

  if (access.status === 'anonymous') redirect('/acesso');
  if (access.status === 'unavailable') {
    return (
      <div className={styles.pageWrapper}>
        <Header />
        <main className={styles.mainContainer}>
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-center text-[#A6A095]" role="alert">
            <p>Não foi possível verificar seu acesso agora.</p>
            <Link href="/configuracoes" className="rounded border border-[#D3B97B] px-4 py-2 text-[#D3B97B]">
              Tentar novamente
            </Link>
          </div>
        </main>
        <SiteBehaviorController />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <Header />
      <div className={styles.mainContainer}>
        <Suspense fallback={<AccountSettingsFallback />}>
          <AccountSettingsProvider>
            <AccountSettingsView />
          </AccountSettingsProvider>
        </Suspense>
      </div>
      <SiteBehaviorController />
    </div>
  );
}
