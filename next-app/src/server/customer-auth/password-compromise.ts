import 'server-only';
import { createHash } from 'node:crypto';

const PASSWORD_RANGE_ENDPOINT = 'https://api.pwnedpasswords.com/range/';
const PASSWORD_RANGE_TIMEOUT_MS = 2_500;

type PasswordRangeFetcher = (input: string, init?: RequestInit) => Promise<Response>;

export class PasswordCompromiseCheckUnavailable extends Error {
  constructor() {
    super('Password compromise check unavailable');
    this.name = 'PasswordCompromiseCheckUnavailable';
  }
}

export async function isCompromisedPassword(
  password: string,
  fetcher: PasswordRangeFetcher = fetch,
): Promise<boolean> {
  const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);

  let response: Response;
  try {
    response = await fetcher(`${PASSWORD_RANGE_ENDPOINT}${prefix}`, {
      headers: {
        'Add-Padding': 'true',
        'User-Agent': 'the-wine-customer-auth-password-policy',
      },
      signal: AbortSignal.timeout(PASSWORD_RANGE_TIMEOUT_MS),
    });
  } catch {
    throw new PasswordCompromiseCheckUnavailable();
  }

  if (!response.ok) throw new PasswordCompromiseCheckUnavailable();

  let body: string;
  try {
    body = await response.text();
  } catch {
    throw new PasswordCompromiseCheckUnavailable();
  }

  return body.split(/\r?\n/).some((line) => {
    const [candidateSuffix, count] = line.trim().split(':');
    return candidateSuffix?.toUpperCase() === suffix && Number.parseInt(count ?? '0', 10) > 0;
  });
}
