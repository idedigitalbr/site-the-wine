export type AccountTab = 'dados' | 'notificacoes' | 'dados-bancarios';

export interface UserProfile {
  name: string;
  email: string;
  cpf: string;
  avatarUrl?: string;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NotificationPreferences {
  reservationConfirmations: boolean;
  reservationReminders: boolean;
  newsAndEvents: boolean;
  promotions: boolean;
  whatsAppConfigured: boolean;
  whatsAppNumber?: string;
}

export interface PaymentMethod {
  id: string;
  brand: 'visa' | 'mastercard' | 'elo' | 'amex';
  type: string;
  last4: string;
  expiry: string;
  isPrimary?: boolean;
}

export type TransactionType = 'Reserva' | 'Reembolso';
export type TransactionStatus = 'Pago' | 'Cancelado' | 'Concluído';

export interface AccountTransaction {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  paymentBrand: 'visa' | 'mastercard' | 'pix';
  paymentDetails: string;
  status: TransactionStatus;
  amount: string;
}

export interface AccountSettingsContextValue {
  activeTab: AccountTab;
  setActiveTab: (tab: AccountTab) => void;
  profile: UserProfile;
  isProfileLoading: boolean;
  isProfileSaving: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; message?: string }>;
  changePassword: (input: PasswordChangeInput) => Promise<{ success: boolean; message?: string }>;
  notifications: NotificationPreferences;
  toggleNotification: (key: keyof NotificationPreferences, value: boolean) => Promise<void>;
  saveWhatsAppNumber: (number: string) => Promise<{ success: boolean; message?: string }>;
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (card: Omit<PaymentMethod, 'id'>) => Promise<{ success: boolean; message?: string }>;
  removePaymentMethod: (id: string) => Promise<{ success: boolean; message?: string }>;
  transactions: AccountTransaction[];
  transactionsStatus: 'idle' | 'loading' | 'ready' | 'error';
  retryTransactions: () => void;
  transactionFilter: string;
  setTransactionFilter: (filter: string) => void;
  filteredTransactions: AccountTransaction[];
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  clearToast: () => void;
}
