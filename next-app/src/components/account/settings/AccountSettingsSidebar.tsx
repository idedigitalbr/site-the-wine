'use client';

import React from 'react';
import { User, Bell, CreditCard } from 'lucide-react';
import { useAccountSettings } from './AccountSettingsContext';
import type { AccountTab } from '@/types/account-settings';
import styles from './AccountSettings.module.css';

interface NavItemDef {
  key: AccountTab;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const navItems: NavItemDef[] = [
  { key: 'dados', label: 'Dados da conta', icon: User },
  { key: 'notificacoes', label: 'Notificações', icon: Bell },
  { key: 'dados-bancarios', label: 'Dados bancários', icon: CreditCard },
];

export function AccountSettingsSidebar() {
  const { activeTab, setActiveTab, profile, isProfileLoading } = useAccountSettings();
  const profileName = isProfileLoading && !profile.name ? 'Carregando…' : profile.name;
  const profileEmail = isProfileLoading && !profile.name ? '' : profile.email;

  return (
    <aside className={styles.sidebar} aria-label="Menu de configurações da conta">
      <div className={styles.profileCard}>
        <div className={styles.avatarContainer}>
          <User size={28} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div className={styles.profileInfo}>
          <h2 className={styles.profileName} title={profileName}>
            {profileName}
          </h2>
          <p className={styles.profileEmail} title={profileEmail}>
            {profileEmail}
          </p>
        </div>
      </div>

      <nav className={styles.navList}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => setActiveTab(item.key)}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={styles.navIcon} size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
