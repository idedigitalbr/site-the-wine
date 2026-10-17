import 'server-only';

export function getTrustedCustomerAuthOrigins(
  baseURL?: string,
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  const configuredOrigins = environment.CUSTOMER_AUTH_TRUSTED_ORIGINS?.split(',') ?? [];
  const candidates = [
    baseURL,
    environment.BETTER_AUTH_URL,
    environment.PUBLIC_APP_URL,
    ...configuredOrigins,
  ].filter((value): value is string => Boolean(value?.trim()));

  return [...new Set(candidates.map((value) => new URL(value.trim()).origin))];
}

export function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const trustedOrigins = getTrustedCustomerAuthOrigins();
    if (trustedOrigins.length === 0) trustedOrigins.push(new URL(request.url).origin);
    return trustedOrigins.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function getClientIpBucket(request: Request): string {
  if (process.env.CUSTOMER_AUTH_TRUST_PROXY_HEADERS !== 'true') return 'untrusted-proxy';
  const ip = request.headers.get('x-real-ip')?.trim();
  return ip && ip.length <= 80 ? ip : 'unknown';
}
