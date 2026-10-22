import { z } from 'zod';
import { isValidCpf, sanitizeCpfInput } from './cpf';
import { normalizeRecoveryEmail } from './customer-auth-schema';

export const RECOVERY_PREFILL_STORAGE_KEY = 'thewine:recovery-identifier-prefill';
export const RECOVERY_CODE_TTL_SECONDS = 600;
export const RECOVERY_CODE_LENGTH = 6;

export type ParsedRecoveryIdentifier =
  | { ok: true; kind: 'email' | 'cpf'; normalizedValue: string }
  | { ok: false; message: string };

export type PasswordChecklistState = {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
};

const emailValidator = z.string().max(254).pipe(z.email());

export function parseRecoveryIdentifier(raw: string): ParsedRecoveryIdentifier {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'Digite seu e-mail ou CPF.' };
  }
  if (trimmed.includes('@')) {
    return parseEmailIdentifier(trimmed);
  }
  return parseCpfIdentifier(trimmed);
}

function parseEmailIdentifier(trimmed: string): ParsedRecoveryIdentifier {
  const normalized = normalizeRecoveryEmail(trimmed);
  const parsed = emailValidator.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, message: 'Informe um endereço de e-mail válido.' };
  }
  return { ok: true, kind: 'email', normalizedValue: parsed.data };
}

function parseCpfIdentifier(trimmed: string): ParsedRecoveryIdentifier {
  const digits = sanitizeCpfInput(trimmed);
  if (!isValidCpf(digits)) {
    return { ok: false, message: 'Confira os 11 números do CPF ou digite um e-mail válido.' };
  }
  return { ok: true, kind: 'cpf', normalizedValue: digits };
}

export function evaluateRecoveryPasswordRules(password: string): PasswordChecklistState {
  const chars = Array.from(password);
  return {
    minLength: chars.length >= 8 && chars.length <= 128,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
}

export function isRecoveryPasswordValid(password: string): boolean {
  if (password.trim().length === 0) return false;
  const rules = evaluateRecoveryPasswordRules(password);
  return rules.minLength && rules.hasUppercase && rules.hasLowercase && rules.hasNumber;
}

export const requestRecoveryCodeSchema = z.object({
  identifier: z.string().trim().min(1, 'Digite seu e-mail ou CPF.').max(254),
});

export const verifyRecoveryCodeSchema = z.object({
  identifier: z.string().trim().min(1, 'Identificador ausente.').max(254),
  code: z.string().trim().regex(/^\d{6}$/, 'Digite os 6 números do código enviado ao seu e-mail.'),
});

export const resetRecoveredPasswordSchema = z.object({
  resetToken: z.string().trim().min(32, 'Sessão de redefinição inválida.').max(256),
  newPassword: z.string().max(128, 'A senha deve ter até 128 caracteres.'),
  confirmPassword: z.string().max(128),
});
