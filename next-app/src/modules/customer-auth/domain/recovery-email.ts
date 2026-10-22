import { z } from 'zod';

export const RECOVERY_EMAIL_MAX_LENGTH = 254;
const emailSchema = z.email();

export function normalizeRecoveryEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidRecoveryEmail(value: string): boolean {
  const normalized = normalizeRecoveryEmail(value);
  return Array.from(value).length <= RECOVERY_EMAIL_MAX_LENGTH
    && normalized.length > 0
    && !/[\p{Cc}\p{Cf}\s]/u.test(normalized)
    && emailSchema.safeParse(normalized).success;
}
