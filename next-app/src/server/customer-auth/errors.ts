import 'server-only';

export class CustomerAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'CustomerAuthError';
  }
}

export function isDuplicateKey(error: unknown, keyName?: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; sqlMessage?: string; message?: string };
  if (candidate.code !== 'ER_DUP_ENTRY') return false;
  if (!keyName) return true;
  return `${candidate.sqlMessage ?? ''} ${candidate.message ?? ''}`.includes(keyName);
}
