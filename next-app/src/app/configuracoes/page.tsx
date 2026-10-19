import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import '../../../public/style.css';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import { Header } from '@/components/layout/Header';
import { AccountSettingsProvider } from '@/components/account/settings/AccountSettingsContext';
import { AccountSettingsView } from '@/components/account/settings/AccountSettingsView';
import styles from '@/components/account/settings/AccountSettings.module.css';

export const metadata: Metadata = {
  title: 'Configurações da conta | The Wine Experience',
  description: 'Gerencie suas informações pessoais, segurança, preferências de notificação e formas de pagamento.',
  alternates: {
    canonical: '/configuracoes',
  },
};

function AccountSettingsFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px] text-[#A6A095]">
      <p>Carregando configurações da conta…</p>
    </div>
  );
}

export default function AccountSettingsPage() {
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
