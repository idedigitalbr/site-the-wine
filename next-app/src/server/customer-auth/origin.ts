import 'server-only';

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return null;
  }
}

function getLoopbackAlias(url: URL): string | null {
  if (url.hostname === '127.0.0.1') return 'localhost';
  if (url.hostname === 'localhost') return '127.0.0.1';
  return null;
}

function expandLoopbackOrigin(origin: string): string[] {
  const url = new URL(origin);
  const alias = getLoopbackAlias(url);
  if (!alias) return [origin];
  const port = url.port ? `:${url.port}` : '';
  return [origin, `${url.protocol}//${alias}${port}`];
}

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

  const origins = candidates
    .map(normalizeOrigin)
    .filter((value): value is string => value !== null);
  return [...new Set(origins.flatMap(expandLoopbackOrigin))];
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
