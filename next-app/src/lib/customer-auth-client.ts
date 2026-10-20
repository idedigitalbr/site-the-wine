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
  return value === '/lista-de-reservas' || value === '/reservas';
}
