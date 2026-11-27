'use client';

import React from 'react';
import { useAccountSettings } from './AccountSettingsContext';
import { AccountSettingsSidebar } from './AccountSettingsSidebar';
import { AccountDataTab } from './tabs/AccountDataTab';
import { NotificationsTab } from './tabs/NotificationsTab';
import { BankingDataTab } from './tabs/BankingDataTab';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import styles from './AccountSettings.module.css';

export function AccountSettingsView() {
  const { activeTab, toast, clearToast } = useAccountSettings();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dados':
        return <AccountDataTab />;
      case 'notificacoes':
        return <NotificationsTab />;
      case 'dados-bancarios':
        return <BankingDataTab />;
      default:
        return <AccountDataTab />;
    }
  };

  return (
    <div className={styles.settingsLayout}>
      <AccountSettingsSidebar />
      <main className={styles.mainPane}>{renderActiveTab()}</main>

      {/* Dynamic Feedback Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`${styles.toastContainer} ${
            toast.type === 'success'
              ? styles.toastSuccess
              : toast.type === 'error'
              ? styles.toastError
              : styles.toastInfo
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={clearToast}
            className="ml-2 opacity-70 hover:opacity-100"
            aria-label="Fechar notificação"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
