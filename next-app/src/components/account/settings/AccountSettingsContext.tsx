'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  changePasswordSchema,
  sanitizeNameForSubmit,
  updateProfileSchema,
  updateWhatsAppSchema,
  validateNewPasswordStrength,
} from '@/modules/account-settings/domain/account-settings-schema';
import {
  fetchAccountSettings,
  fetchAccountTransactions,
  isAccountSettingsUnauthorized,
  requestChangePassword,
  requestSaveWhatsApp,
  requestUpdateNotificationPreferences,
  requestUpdateProfile,
} from '@/lib/account-settings-client';
import type {
  AccountSettingsContextValue,
  AccountTab,
  AccountTransaction,
  NotificationPreferences,
  PasswordChangeInput,
  PaymentMethod,
  UserProfile,
} from '@/types/account-settings';

const initialProfile: UserProfile = {
  name: '',
  email: '',
  cpf: '***.***.***-**',
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

const initialTransactions: AccountTransaction[] = [];
const validTabs: AccountTab[] = ['dados', 'notificacoes', 'dados-bancarios'];
const preferenceKeys = ['reservationConfirmations', 'reservationReminders', 'newsAndEvents', 'promotions'] as const;
const localPreferenceKeys = ['reservationConfirmations', 'reservationReminders'] as const;
type EmailPreferenceKey = typeof preferenceKeys[number];
type ActiveTransactionRequest = { controller: AbortController; generation: number };

const AccountSettingsContext = createContext<AccountSettingsContextValue | undefined>(undefined);

function notificationStorageKey(userId: string): string {
  return `thewine:notification-prefs:${userId}`;
}

function readStoredPreferences(userId: string): Partial<Record<EmailPreferenceKey, boolean>> {
  try {
    const stored = window.localStorage.getItem(notificationStorageKey(userId));
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return Object.fromEntries(
      localPreferenceKeys
        .filter((key) => typeof parsed[key] === 'boolean')
        .map((key) => [key, parsed[key]]),
    ) as Partial<Record<EmailPreferenceKey, boolean>>;
  } catch {
    return {};
  }
}

function writeStoredPreferences(userId: string | null, preferences: NotificationPreferences): void {
  if (!userId) return;
  try {
    const granularPreferences = Object.fromEntries(
      preferenceKeys.map((key) => [key, preferences[key]]),
    );
    window.localStorage.setItem(notificationStorageKey(userId), JSON.stringify(granularPreferences));
  } catch {
    // localStorage is only a cache; the API remains the source of truth.
  }
}

function toEmailPreferences(preferences: NotificationPreferences) {
  return {
    reservationConfirmations: preferences.reservationConfirmations,
    reservationReminders: preferences.reservationReminders,
    newsAndEvents: preferences.newsAndEvents,
    promotions: preferences.promotions,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isEmailPreferenceKey(key: keyof NotificationPreferences): key is EmailPreferenceKey {
  return preferenceKeys.includes(key as EmailPreferenceKey);
}

function isCurrentTransactionRequest(
  isMounted: boolean,
  signal: AbortSignal,
  activeRequest: ActiveTransactionRequest | null,
  generation: number,
): boolean {
  return isMounted && !signal.aborted && activeRequest?.generation === generation;
}

function handleTransactionSuccess(
  payload: { userId: string; transactions: AccountTransaction[] },
  expectedUserId: string,
  isCurrent: () => boolean,
  onUserMismatch: () => void,
  onSuccess: (transactions: AccountTransaction[]) => void,
): void {
  if (!isCurrent()) return;
  if (payload.userId !== expectedUserId) {
    onUserMismatch();
    return;
  }
  onSuccess(payload.transactions);
}

function handleTransactionFailure(
  error: unknown,
  isCurrent: () => boolean,
  onUnauthorized: () => void,
  onFailure: () => void,
): void {
  if (!isCurrent()) return;
  if (isAccountSettingsUnauthorized(error)) {
    onUnauthorized();
    return;
  }
  onFailure();
}

function canStartTransactionLoad(input: {
  isMounted: boolean;
  isRedirecting: boolean;
  hasProfileHydrated: boolean;
  accountUserId: string | null;
  force: boolean;
  transactionsStatus: 'idle' | 'loading' | 'ready' | 'error';
  activeRequest: ActiveTransactionRequest | null;
}): boolean {
  if (!input.isMounted || input.isRedirecting) return false;
  if (!input.hasProfileHydrated || !input.accountUserId) return false;
  if (!input.force && input.transactionsStatus !== 'idle') return false;
  return !input.activeRequest;
}

export function AccountSettingsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    [router],
  );

  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreferences>(initialNotifications);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods);
  const [transactions, setTransactions] = useState<AccountTransaction[]>(initialTransactions);
  const [transactionsStatus, setTransactionsStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [transactionFilter, setTransactionFilter] = useState<string>('todos');
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [hasProfileHydrated, setHasProfileHydrated] = useState(false);
  const transactionRequestRef = useRef<ActiveTransactionRequest | null>(null);
  const transactionGenerationRef = useRef(0);
  const isMountedRef = useRef(true);
  const isRedirectingRef = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    async function hydrateSettings() {
      try {
        const settings = await fetchAccountSettings(controller.signal);
        if (!isMounted) return;
        setAccountUserId(settings.userId);
        setProfile(settings.profile);
        setNotifications((current) => ({ ...current, ...settings.notifications, ...readStoredPreferences(settings.userId) }));
        setHasProfileHydrated(true);
      } catch (error) {
        if (!isMounted || controller.signal.aborted) return;
        if (isAccountSettingsUnauthorized(error)) {
          isRedirectingRef.current = true;
          router.replace('/acesso?auth=expired');
          return;
        }
        showToast(errorMessage(error, 'Não foi possível carregar suas configurações.'), 'error');
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    }

    void hydrateSettings();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [router, showToast]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      transactionGenerationRef.current += 1;
      transactionRequestRef.current?.controller.abort();
      transactionRequestRef.current = null;
    };
  }, []);

  const loadTransactions = useCallback((force = false) => {
    if (!canStartTransactionLoad({
      isMounted: isMountedRef.current,
      isRedirecting: isRedirectingRef.current,
      hasProfileHydrated,
      accountUserId,
      force,
      transactionsStatus,
      activeRequest: transactionRequestRef.current,
    })) return;

    const controller = new AbortController();
    const generation = transactionGenerationRef.current + 1;
    transactionGenerationRef.current = generation;
    transactionRequestRef.current = { controller, generation };
    const expectedUserId = accountUserId!;
    setTransactionsStatus('loading');
    const isCurrent = () => isCurrentTransactionRequest(
      isMountedRef.current,
      controller.signal,
      transactionRequestRef.current,
      generation,
    );
    const redirectToExpired = () => {
      setTransactions([]);
      setTransactionsStatus('error');
      isRedirectingRef.current = true;
      router.replace('/acesso?auth=expired');
    };

    void fetchAccountTransactions(controller.signal)
      .then((payload) => handleTransactionSuccess(
        payload,
        expectedUserId,
        isCurrent,
        redirectToExpired,
        (nextTransactions) => {
          setTransactions(nextTransactions);
          setTransactionsStatus('ready');
        },
      ))
      .catch((error) => handleTransactionFailure(
        error,
        isCurrent,
        redirectToExpired,
        () => setTransactionsStatus('error'),
      ))
      .finally(() => {
        if (transactionRequestRef.current?.generation === generation) transactionRequestRef.current = null;
      });
  }, [accountUserId, hasProfileHydrated, router, transactionsStatus]);

  useEffect(() => {
    if (activeTab === 'dados-bancarios' && hasProfileHydrated && transactionsStatus === 'idle') {
      loadTransactions();
    }
  }, [activeTab, hasProfileHydrated, loadTransactions, transactionsStatus]);

  const retryTransactions = useCallback(() => {
    if (isRedirectingRef.current || transactionRequestRef.current) return;
    loadTransactions(true);
  }, [loadTransactions]);

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>): Promise<{ success: boolean; message?: string }> => {
      const parsed = updateProfileSchema.safeParse({
        name: sanitizeNameForSubmit(data.name ?? profile.name),
        email: data.email ?? profile.email,
      });
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Dados inválidos.';
        showToast(message, 'error');
        return { success: false, message };
      }
      setIsProfileSaving(true);
      try {
        const result = await requestUpdateProfile(parsed.data);
        setProfile(result.profile);
        showToast('Informações pessoais atualizadas com sucesso!', 'success');
        return { success: true };
      } catch (error) {
        if (isAccountSettingsUnauthorized(error)) router.replace('/acesso?auth=expired');
        const message = errorMessage(error, 'Erro ao atualizar informações pessoais.');
        showToast(message, 'error');
        return { success: false, message };
      } finally {
        setIsProfileSaving(false);
      }
    },
    [profile.email, profile.name, router, showToast],
  );

  const changePassword = useCallback(
    async (input: PasswordChangeInput): Promise<{ success: boolean; message?: string }> => {
      const parsed = changePasswordSchema.safeParse(input);
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Dados de senha inválidos.';
        showToast(message, 'error');
        return { success: false, message };
      }
      const strength = validateNewPasswordStrength(parsed.data.newPassword, [profile.name, profile.email]);
      if (!strength.valid) {
        showToast(strength.message ?? 'Escolha uma senha mais forte.', 'error');
        return { success: false, message: strength.message };
      }
      try {
        await requestChangePassword(parsed.data);
        showToast('Senha alterada com sucesso!', 'success');
        return { success: true };
      } catch (error) {
        if (isAccountSettingsUnauthorized(error)) router.replace('/acesso?auth=expired');
        const message = errorMessage(error, 'Não foi possível alterar a senha. Tente novamente.');
        showToast(message, 'error');
        return { success: false, message };
      }
    },
    [profile.email, profile.name, router, showToast],
  );

  const toggleNotification = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      if (!isEmailPreferenceKey(key)) return;
      const previous = notifications;
      const next = { ...notifications, [key]: value };
      setNotifications(next);
      writeStoredPreferences(accountUserId, next);
      try {
        await requestUpdateNotificationPreferences(toEmailPreferences(next));
      } catch (error) {
        setNotifications(previous);
        writeStoredPreferences(accountUserId, previous);
        if (isAccountSettingsUnauthorized(error)) router.replace('/acesso?auth=expired');
        showToast('Não foi possível salvar sua preferência de notificação.', 'error');
      }
    },
    [accountUserId, notifications, router, showToast],
  );

  const saveWhatsAppNumber = useCallback(
    async (number: string): Promise<{ success: boolean; message?: string }> => {
      const parsed = updateWhatsAppSchema.safeParse({ phone: number });
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Informe um número de WhatsApp válido.';
        showToast(message, 'error');
        return { success: false, message };
      }
      try {
        const result = await requestSaveWhatsApp(number);
        setNotifications((current) => ({
          ...current,
          whatsAppConfigured: result.whatsAppConfigured,
          whatsAppNumber: result.whatsAppNumber,
        }));
        showToast('Número de WhatsApp salvo com sucesso!', 'success');
        return { success: true };
      } catch (error) {
        if (isAccountSettingsUnauthorized(error)) router.replace('/acesso?auth=expired');
        const message = errorMessage(error, 'Não foi possível salvar o número.');
        showToast(message, 'error');
        return { success: false, message };
      }
    },
    [router, showToast],
  );

  const addPaymentMethod = useCallback(
    async (card: Omit<PaymentMethod, 'id'>): Promise<{ success: boolean; message?: string }> => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const newId = `pm-${Date.now()}`;
        setPaymentMethods((previous) => {
          if (card.isPrimary) {
            return [...previous.map((item) => ({ ...item, isPrimary: false })), { ...card, id: newId }];
          }
          return [...previous, { ...card, id: newId }];
        });
        showToast('Forma de pagamento adicionada com sucesso!', 'success');
        return { success: true };
      } catch {
        showToast('Erro ao adicionar forma de pagamento.', 'error');
        return { success: false, message: 'Erro ao adicionar.' };
      }
    },
    [showToast],
  );

  const removePaymentMethod = useCallback(
    async (id: string): Promise<{ success: boolean; message?: string }> => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setPaymentMethods((previous) => previous.filter((card) => card.id !== id));
        showToast('Forma de pagamento removida com sucesso.', 'info');
        return { success: true };
      } catch {
        showToast('Erro ao remover forma de pagamento.', 'error');
        return { success: false, message: 'Erro ao remover.' };
      }
    },
    [showToast],
  );

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === 'reservas') return transactions.filter((transaction) => transaction.type === 'Reserva');
    if (transactionFilter === 'reembolsos') return transactions.filter((transaction) => transaction.type === 'Reembolso');
    return transactions;
  }, [transactionFilter, transactions]);

  const value = useMemo<AccountSettingsContextValue>(() => ({
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
    transactionsStatus,
    retryTransactions,
    transactionFilter,
    setTransactionFilter,
    filteredTransactions,
    toast,
    clearToast,
  }), [
    activeTab,
    addPaymentMethod,
    changePassword,
    clearToast,
    filteredTransactions,
    isProfileLoading,
    isProfileSaving,
    notifications,
    paymentMethods,
    profile,
    removePaymentMethod,
    retryTransactions,
    saveWhatsAppNumber,
    setActiveTab,
    toggleNotification,
    toast,
    transactionFilter,
    transactions,
    transactionsStatus,
    updateProfile,
  ]);

  return <AccountSettingsContext.Provider value={value}>{children}</AccountSettingsContext.Provider>;
}

export function useAccountSettings() {
  const context = useContext(AccountSettingsContext);
  if (!context) throw new Error('useAccountSettings must be used within an AccountSettingsProvider');
  return context;
}
