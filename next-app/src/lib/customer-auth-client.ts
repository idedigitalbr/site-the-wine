import type { CustomerAuthDestination } from './customer-auth-destination';

export type CustomerSessionPayload = {
  status: 'authenticated' | 'anonymous';
  user?: { id: string; name: string; email?: string };
};

export type CustomerSignupPayload = {
  cpf: string;
  name: string;
  birthDate: string;
  recoveryEmail: string;
  recoveryEmailConfirmation: string;
  password: string;
  passwordConfirmation: string;
  acceptWeakPassword: boolean;
  marketingConsent: boolean;
  acceptTerms: true;
};

export type CustomerAuthErrorPayload = { error?: string; message?: string };

async function readPayload(response: Response): Promise<unknown> {
  return response.json().catch(() => ({}));
}

export async function getCustomerSession(signal?: AbortSignal): Promise<CustomerSessionPayload> {
  const response = await fetch('/api/customer-auth/session', {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
    signal,
  });
  const payload = await readPayload(response);
  if (!response.ok || typeof payload !== 'object' || payload === null) throw new Error('session_unavailable');
  return payload as CustomerSessionPayload;
}

export async function signInCustomer(cpf: string, password: string): Promise<CustomerAuthErrorPayload> {
  const response = await fetch('/api/customer-auth/sign-in', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ cpf, password }),
  });
  const payload = await readPayload(response) as CustomerAuthErrorPayload;
  if (!response.ok) throw Object.assign(new Error(payload.message ?? 'Não foi possível entrar.'), { code: payload.error });
  return payload;
}

export async function signUpCustomer(payload: CustomerSignupPayload): Promise<CustomerAuthErrorPayload> {
  const response = await fetch('/api/customer-auth/sign-up', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await readPayload(response) as CustomerAuthErrorPayload;
  if (!response.ok) throw Object.assign(new Error(result.message ?? 'Não foi possível criar sua conta.'), { code: result.error });
  return result;
}

export function isCustomerAuthDestination(value: string): value is CustomerAuthDestination {
  return value === '/#home' || value === '/lista-de-reservas' || value === '/reservas';
}

export async function requestPasswordRecovery(identifier: string): Promise<{ status: 'code_sent'; expiresInSeconds: number }> {
  const response = await fetch('/api/customer-auth/password-recovery/request', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  const payload = await readPayload(response) as CustomerAuthErrorPayload & { status?: 'code_sent'; expiresInSeconds?: number };
  if (!response.ok) throw Object.assign(new Error(payload.message ?? 'Não foi possível enviar o código.'), { code: payload.error });
  return { status: 'code_sent', expiresInSeconds: payload.expiresInSeconds ?? 600 };
}

export async function verifyPasswordRecovery(identifier: string, code: string): Promise<{ status: 'verified'; resetToken: string }> {
  const response = await fetch('/api/customer-auth/password-recovery/verify', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, code }),
  });
  const payload = await readPayload(response) as CustomerAuthErrorPayload & { resetToken?: string };
  if (!response.ok || typeof payload.resetToken !== 'string') {
    throw Object.assign(new Error(payload.message ?? 'Código inválido ou expirado.'), { code: payload.error });
  }
  return { status: 'verified', resetToken: payload.resetToken };
}

export async function resetCustomerPasswordRequest(
  resetToken: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ status: 'password_reset' }> {
  const response = await fetch('/api/customer-auth/password-recovery/reset', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
  });
  const payload = await readPayload(response) as CustomerAuthErrorPayload;
  if (!response.ok) throw Object.assign(new Error(payload.message ?? 'Não foi possível salvar a nova senha.'), { code: payload.error });
  return { status: 'password_reset' };
}
