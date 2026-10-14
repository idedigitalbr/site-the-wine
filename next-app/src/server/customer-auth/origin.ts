import 'server-only';

export function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const configuredOrigin = process.env.BETTER_AUTH_URL ?? process.env.PUBLIC_APP_URL;
    const expected = configuredOrigin ? new URL(configuredOrigin).origin : new URL(request.url).origin;
    return new URL(origin).origin === expected;
  } catch {
    return false;
  }
}

export function getClientIpBucket(request: Request): string {
  if (process.env.CUSTOMER_AUTH_TRUST_PROXY_HEADERS !== 'true') return 'untrusted-proxy';
  const ip = request.headers.get('x-real-ip')?.trim();
  return ip && ip.length <= 80 ? ip : 'unknown';
}
