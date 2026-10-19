'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  AccountSettingsContextValue,
  AccountTab,
  UserProfile,
  PasswordChangeInput,
  NotificationPreferences,
  PaymentMethod,
  AccountTransaction,
} from '@/types/account-settings';

const initialProfile: UserProfile = {
  name: 'João da Silva',
  email: 'joao@email.com',
  cpf: '123.456.789-00',
};

const initialNotifications: NotificationPreferences = {
  reservationConfirmations: true,
  reservationReminders: true,
  newsAndEvents: true,
  promotions: false,
  whatsAppConfigured: false,
  whatsAppNumber: '',
};

const initialPaymentMethods: PaymentMethod[] = [
  {
    id: 'pm-1',
    brand: 'visa',
    type: 'Cartão de crédito',
    last4: '1234',
    expiry: '08/28',
    isPrimary: true,
  },
  {
    id: 'pm-2',
    brand: 'mastercard',
    type: 'Cartão de crédito',
    last4: '5678',
    expiry: '11/26',
    isPrimary: false,
  },
];

const initialTransactions: AccountTransaction[] = [
  {
    id: 'tx-1',
    date: '16/10/2026',
    description: 'Reserva – Experiência Degustação',
    type: 'Reserva',
    paymentBrand: 'visa',
    paymentDetails: '•••• 1234',
    status: 'Pago',
    amount: 'R$ 350,00',
  },
  {
    id: 'tx-2',
    date: '02/10/2026',
    description: 'Reserva – Jantar Harmonizado',
    type: 'Reserva',
    paymentBrand: 'pix',
    paymentDetails: 'PIX',
    status: 'Pago',
    amount: 'R$ 420,00',
  },
  {
    id: 'tx-3',
    date: '15/09/2026',
    description: 'Reserva – Wine Experience',
    type: 'Reserva',
    paymentBrand: 'mastercard',
    paymentDetails: '•••• 5678',
    status: 'Cancelado',
    amount: 'R$ 280,00',
  },
  {
    id: 'tx-4',
    date: '10/08/2026',
    description: 'Reembolso – Reserva Cancelada',
    type: 'Reembolso',
    paymentBrand: 'pix',
    paymentDetails: 'PIX',
    status: 'Concluído',
    amount: 'R$ 280,00',
  },
  {
    id: 'tx-5',
    date: '22/07/2026',
    description: 'Reserva – Degustação Premium',
    type: 'Reserva',
    paymentBrand: 'visa',
    paymentDetails: '•••• 1234',
    status: 'Pago',
    amount: 'R$ 450,00',
  },
  {
    id: 'tx-6',
    date: '05/07/2026',
    description: 'Reserva – Noite de Safras Raras',
    type: 'Reserva',
    paymentBrand: 'mastercard',
    paymentDetails: '•••• 5678',
    status: 'Pago',
    amount: 'R$ 520,00',
  },
  {
    id: 'tx-7',
    date: '18/06/2026',
    description: 'Reserva – Menu Confiança do Sommelier',
    type: 'Reserva',
    paymentBrand: 'pix',
    paymentDetails: 'PIX',
    status: 'Pago',
    amount: 'R$ 390,00',
  },
  {
    id: 'tx-8',
    date: '02/06/2026',
    description: 'Reembolso – Ajuste de Reserva',
    type: 'Reembolso',
    paymentBrand: 'visa',
    paymentDetails: '•••• 1234',
    status: 'Concluído',
    amount: 'R$ 150,00',
  },
  {
    id: 'tx-9',
    date: '14/05/2026',
    description: 'Reserva – Jantar Harmonizado',
    type: 'Reserva',
    paymentBrand: 'visa',
    paymentDetails: '•••• 1234',
    status: 'Pago',
    amount: 'R$ 420,00',
  },
  {
    id: 'tx-10',
    date: '28/04/2026',
    description: 'Reserva – Experiência Degustação',
    type: 'Reserva',
    paymentBrand: 'pix',
    paymentDetails: 'PIX',
    status: 'Cancelado',
    amount: 'R$ 350,00',
  },
  {
    id: 'tx-11',
    date: '12/04/2026',
    description: 'Reserva – Degustação Vertical de Tintos',
    type: 'Reserva',
    paymentBrand: 'mastercard',
    paymentDetails: '•••• 5678',
    status: 'Pago',
    amount: 'R$ 480,00',
  },
  {
    id: 'tx-12',
    date: '25/03/2026',
    description: 'Reembolso – Reserva Reagendada',
    type: 'Reembolso',
    paymentBrand: 'pix',
    paymentDetails: 'PIX',
    status: 'Concluído',
    amount: 'R$ 350,00',
  },
];

const validTabs: AccountTab[] = ['dados', 'notificacoes', 'dados-bancarios'];
const AccountSettingsContext = createContext<AccountSettingsContextValue | undefined>(undefined);

export function AccountSettingsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active Tab state synced with URL search params
  const tabFromUrl = searchParams.get('tab') as AccountTab | null;
  const urlTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : null;
  const [selectedTab, setSelectedTab] = useState<AccountTab>(urlTab ?? 'dados');
  const activeTab = urlTab ?? selectedTab;

  const setActiveTab = useCallback(
    (tab: AccountTab) => {
      setSelectedTab(tab);
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  // Dynamic user profile state
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState<NotificationPreferences>(initialNotifications);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods);

  // Transactions state & filtering
  const [transactions] = useState<AccountTransaction[]>(initialTransactions);
  const [transactionFilter, setTransactionFilter] = useState<string>('todos');

  // Feedback Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Attempt to load customer session if authenticated
  useEffect(() => {
    let isMounted = true;
    async function loadCustomerSession() {
      try {
        setIsProfileLoading(true);
        const res = await fetch('/api/customer-auth/session', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.status === 'authenticated' && data.user) {
          setProfile((prev) => ({
            ...prev,
            name: data.user.name || prev.name,
            email: data.user.email || prev.email,
          }));
        }
      } catch {
        // Fallback gracefully to default reference data
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    }
    void loadCustomerSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update Profile
  const updateProfile = useCallback(
    async (data: Partial<UserProfile>): Promise<{ success: boolean; message?: string }> => {
      setIsProfileSaving(true);
      try {
        // Simulate API network latency ready for real endpoint connection
        await new Promise((resolve) => setTimeout(resolve, 600));
        setProfile((prev) => {
          const updated = { ...prev, ...data };
          return updated;
        });
        showToast('Informações pessoais atualizadas com sucesso!', 'success');
        return { success: true };
      } catch {
        showToast('Erro ao atualizar informações pessoais.', 'error');
        return { success: false, message: 'Erro ao atualizar informações pessoais.' };
      } finally {
        setIsProfileSaving(false);
      }
    },
    [showToast]
  );

  // Change Password
  const changePassword = useCallback(
    async (input: PasswordChangeInput): Promise<{ success: boolean; message?: string }> => {
      if (!input.currentPassword) {
        showToast('Digite sua senha atual.', 'error');
        return { success: false, message: 'Digite sua senha atual.' };
      }
      if (!input.newPassword || input.newPassword.length < 6) {
        showToast('A nova senha deve ter no mínimo 6 caracteres.', 'error');
        return { success: false, message: 'A nova senha deve ter no mínimo 6 caracteres.' };
      }
      if (input.newPassword !== input.confirmPassword) {
        showToast('As senhas digitadas não coincidem.', 'error');
        return { success: false, message: 'As senhas digitadas não coincidem.' };
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 700));
        showToast('Senha alterada com sucesso!', 'success');
        return { success: true };
      } catch {
        showToast('Não foi possível alterar a senha. Tente novamente.', 'error');
        return { success: false, message: 'Não foi possível alterar a senha.' };
      }
    },
    [showToast]
  );

  // Toggle Notification Setting
  const toggleNotification = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      setNotifications((prev) => ({ ...prev, [key]: value }));
      // Ready for API endpoint call:
      // await fetch('/api/customer/notifications', { method: 'POST', body: JSON.stringify({ [key]: value }) });
    },
    []
  );

  // Save WhatsApp Number
  const saveWhatsAppNumber = useCallback(
    async (number: string): Promise<{ success: boolean; message?: string }> => {
      if (!number || number.trim().length < 8) {
        showToast('Informe um número de WhatsApp válido.', 'error');
        return { success: false, message: 'Número inválido.' };
      }
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setNotifications((prev) => ({
          ...prev,
          whatsAppConfigured: true,
          whatsAppNumber: number.trim(),
        }));
        showToast('Número de WhatsApp salvo com sucesso!', 'success');
        return { success: true };
      } catch {
        showToast('Não foi possível salvar o número.', 'error');
        return { success: false, message: 'Erro ao salvar.' };
      }
    },
    [showToast]
  );

  // Add Payment Method
  const addPaymentMethod = useCallback(
    async (card: Omit<PaymentMethod, 'id'>): Promise<{ success: boolean; message?: string }> => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const newId = `pm-${Date.now()}`;
        setPaymentMethods((prev) => {
          if (card.isPrimary) {
            return [...prev.map((c) => ({ ...c, isPrimary: false })), { ...card, id: newId }];
          }
          return [...prev, { ...card, id: newId }];
        });
        showToast('Forma de pagamento adicionada com sucesso!', 'success');
        return { success: true };
      } catch {
        showToast('Erro ao adicionar forma de pagamento.', 'error');
        return { success: false, message: 'Erro ao adicionar.' };
      }
    },
    [showToast]
  );

  // Remove Payment Method
  const removePaymentMethod = useCallback(
    async (id: string): Promise<{ success: boolean; message?: string }> => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setPaymentMethods((prev) => prev.filter((c) => c.id !== id));
        showToast('Forma de pagamento removida com sucesso.', 'info');
        return { success: true };
      } catch {
        showToast('Erro ao remover forma de pagamento.', 'error');
        return { success: false, message: 'Erro ao remover.' };
      }
    },
    [showToast]
  );

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (transactionFilter === 'todos') return transactions;
    if (transactionFilter === 'reservas') return transactions.filter((t) => t.type === 'Reserva');
    if (transactionFilter === 'reembolsos') return transactions.filter((t) => t.type === 'Reembolso');
    return transactions;
  }, [transactions, transactionFilter]);

  const value = useMemo<AccountSettingsContextValue>(
    () => ({
      activeTab,
      setActiveTab,
      profile,
      isProfileLoading,
      isProfileSaving,
      updateProfile,
      changePassword,
      notifications,
      toggleNotification,
      saveWhatsAppNumber,
      paymentMethods,
      addPaymentMethod,
      removePaymentMethod,
      transactions,
      transactionFilter,
      setTransactionFilter,
      filteredTransactions,
      toast,
      clearToast,
    }),
    [
      activeTab,
      setActiveTab,
      profile,
      isProfileLoading,
      isProfileSaving,
      updateProfile,
      changePassword,
      notifications,
      toggleNotification,
      saveWhatsAppNumber,
      paymentMethods,
      addPaymentMethod,
      removePaymentMethod,
      transactions,
      transactionFilter,
      filteredTransactions,
      toast,
      clearToast,
    ]
  );

  return <AccountSettingsContext.Provider value={value}>{children}</AccountSettingsContext.Provider>;
}

export function useAccountSettings() {
  const context = useContext(AccountSettingsContext);
  if (!context) {
    throw new Error('useAccountSettings must be used within an AccountSettingsProvider');
  }
  return context;
}
