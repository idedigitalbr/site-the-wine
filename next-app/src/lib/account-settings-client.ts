import type {
  AccountTransaction,
  NotificationPreferences,
  PasswordChangeInput,
  UserProfile,
} from '@/types/account-settings';

export type AccountSettingsPayload = {
  profile: UserProfile;
  notifications: NotificationPreferences;
  transactions: AccountTransaction[];
};

type ClientError = Error & { isUnauthorized?: boolean };

async function readResponseData(response: Response): Promise<{ message?: string } | null> {
  return response.json().catch(() => null) as Promise<{ message?: string } | null>;
}

function assertResponseIsSuccessful(response: Response, data: { message?: string } | null): void {
  if (response.status === 401) {
    const error = new Error(data?.message ?? 'Sua sessão expirou.') as ClientError;
    error.isUnauthorized = true;
    throw error;
  }
  if (!response.ok) throw new Error(data?.message ?? 'Não foi possível concluir agora.');
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const data = await readResponseData(response);
  assertResponseIsSuccessful(response, data);
  return data as T;
}

export function fetchAccountSettings(signal?: AbortSignal): Promise<AccountSettingsPayload> {
  return requestJson<AccountSettingsPayload>('/api/account/settings', { method: 'GET', signal });
}

export function requestUpdateProfile(input: { name: string; email: string }) {
  return requestJson<{ profile: UserProfile }>('/api/account/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function requestChangePassword(input: PasswordChangeInput) {
  return requestJson<{ status: 'password_updated' }>('/api/account/password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function requestSaveWhatsApp(phone: string) {
  return requestJson<{ whatsAppConfigured: boolean; whatsAppNumber: string }>(
    '/api/account/notifications/whatsapp',
    { method: 'PUT', body: JSON.stringify({ phone }) },
  );
}

export function requestUpdateNotificationPreferences(
  prefs: Omit<NotificationPreferences, 'whatsAppConfigured' | 'whatsAppNumber'>,
) {
  return requestJson<{ preferences: typeof prefs }>('/api/account/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
}

export function isAccountSettingsUnauthorized(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'isUnauthorized' in error && error.isUnauthorized === true);
}
