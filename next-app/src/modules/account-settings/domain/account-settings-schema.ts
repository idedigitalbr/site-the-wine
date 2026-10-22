import { z } from 'zod';
import { validatePasswordBasics } from '@/modules/customer-auth/domain/password-policy';
import { assessPassword } from '@/modules/customer-auth/domain/password-strength';

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F-\u009F]/g;

export function sanitizeTextInput(value: string, maxLength = 160): string {
  return value
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

export function sanitizeNameForSubmit(value: string): string {
  return sanitizeTextInput(value, 160).trim();
}

export function sanitizeEmailInput(value: string): string {
  return value
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .slice(0, 254);
}

export function sanitizePasswordInput(value: string): string {
  return value.replace(/\0/g, '').slice(0, 128);
}

export function extractNationalPhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits.slice(2, 13);
  }
  return digits.slice(0, 11);
}

export function formatWhatsAppPhoneInput(raw: string): string {
  const digits = extractNationalPhoneDigits(raw);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  if (subscriber.length <= 4) return `(${ddd}) ${subscriber}`;
  if (subscriber.length <= 8) {
    return `(${ddd}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
  }
  return `(${ddd}) ${subscriber.slice(0, 5)}-${subscriber.slice(5, 9)}`;
}

export function isValidBrazilianWhatsAppDigits(digits: string): boolean {
  if (!/^[1-9]{2}(?:9\d{8}|[2-8]\d{7})$/.test(digits)) return false;
  const subscriber = digits.slice(2);
  if (/^(\d)\1+$/.test(subscriber)) return false;
  return true;
}

export const updateProfileSchema = z.object({
  name: z
    .string()
    .transform(sanitizeNameForSubmit)
    .pipe(
      z
        .string()
        .min(2, 'Informe seu nome completo (mínimo de 2 caracteres).')
        .max(160, 'O nome deve ter no máximo 160 caracteres.'),
    ),
  email: z
    .string()
    .transform(sanitizeEmailInput)
    .pipe(
      z
        .string()
        .max(254, 'O e-mail deve ter no máximo 254 caracteres.')
        .pipe(z.email('Informe um endereço de e-mail válido.')),
    ),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .transform(sanitizePasswordInput)
      .refine(validatePasswordBasics, 'Digite sua senha atual.'),
    newPassword: z
      .string()
      .transform(sanitizePasswordInput)
      .refine(
        validatePasswordBasics,
        'A nova senha não pode estar vazia e deve ter até 128 caracteres.',
      ),
    confirmPassword: z.string().transform(sanitizePasswordInput),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'As senhas digitadas não coincidem.',
      });
    }
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['newPassword'],
        message: 'A nova senha deve ser diferente da senha atual.',
      });
    }
  });

export function validateNewPasswordStrength(
  password: string,
  userInputs: string[],
): { valid: boolean; score: number; message?: string } {
  if (!validatePasswordBasics(password)) {
    return { valid: false, score: 0, message: 'Digite uma nova senha válida.' };
  }
  const assessment = assessPassword(password, userInputs);
  if (assessment.weak) {
    return {
      valid: false,
      score: assessment.score,
      message: 'Use pelo menos 15 caracteres e evite senhas previsíveis.',
    };
  }
  return { valid: true, score: assessment.score };
}

export const updateWhatsAppSchema = z.object({
  phone: z
    .string()
    .transform(extractNationalPhoneDigits)
    .refine(
      isValidBrazilianWhatsAppDigits,
      'Informe um número com DDD válido (ex: (91) 98765-4321).',
    )
    .transform((digits) => ({
      normalizedPhone: digits,
      formattedPhone: formatWhatsAppPhoneInput(digits),
    })),
});

export const updateNotificationPreferencesSchema = z.object({
  reservationConfirmations: z.boolean(),
  reservationReminders: z.boolean(),
  newsAndEvents: z.boolean(),
  promotions: z.boolean(),
});
