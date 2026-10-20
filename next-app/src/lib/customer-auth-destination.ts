export type CustomerAuthDestination = '/lista-de-reservas' | '/reservas';

const DEFAULT_DESTINATION: CustomerAuthDestination = '/lista-de-reservas';

export function resolveCustomerAuthDestination(value: unknown): CustomerAuthDestination {
  if (typeof value !== 'string') return DEFAULT_DESTINATION;
  if (value !== '/lista-de-reservas' && value !== '/reservas') return DEFAULT_DESTINATION;
  return value;
}

export function customerAuthHref(destination: CustomerAuthDestination, reason?: 'expired' | 'changed'): string {
  if (destination === '/lista-de-reservas' && !reason) return '/acesso';
  const params = new URLSearchParams(destination === '/reservas' ? { returnTo: destination } : undefined);
  if (reason) params.set('auth', reason);
  const query = params.toString();
  return query ? `/acesso?${query}` : '/acesso';
}

export function customerAuthRedirectDestination(value: unknown): CustomerAuthDestination {
  return resolveCustomerAuthDestination(value);
}
