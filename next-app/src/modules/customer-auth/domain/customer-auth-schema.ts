import { z } from 'zod';
import { isValidCpf } from './cpf';
import { isValidBirthDate } from './birth-date';
import { isValidCustomerName, normalizeNameInput } from './name';
import { isValidRecoveryEmail, normalizeRecoveryEmail, RECOVERY_EMAIL_MAX_LENGTH } from './recovery-email';
import { validateSignupPasswordBasics, validateSignupPasswordLength } from './password-policy';

export { normalizeRecoveryEmail } from './recovery-email';

export function todayInSaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export const customerCpfSchema = z.string()
  .regex(/^\d{11}$/, 'Digite os 11 números do CPF.')
  .refine(isValidCpf, 'Confira os dígitos do CPF.');

export const customerSignupSchema = z.object({
  cpf: customerCpfSchema,
  name: z.string().max(200, 'Use um nome válido.').refine(isValidCustomerName, 'Informe um nome completo válido.').transform(normalizeNameInput),
  birthDate: z.string().refine((value) => isValidBirthDate(value, todayInSaoPaulo()), 'Informe uma data válida, que não seja futura.'),
  recoveryEmail: z.string().max(RECOVERY_EMAIL_MAX_LENGTH, 'Use até 254 caracteres.')
    .refine(isValidRecoveryEmail, 'Informe um e-mail válido.').transform(normalizeRecoveryEmail),
  recoveryEmailConfirmation: z.string().max(RECOVERY_EMAIL_MAX_LENGTH, 'Use até 254 caracteres.')
    .refine(isValidRecoveryEmail, 'Confirme o e-mail.').transform(normalizeRecoveryEmail),
  password: z.string().refine(validateSignupPasswordBasics, 'A senha deve ter entre 8 e 20 caracteres e não pode conter apenas espaços.'),
  passwordConfirmation: z.string().refine(validateSignupPasswordLength, 'A senha deve ter entre 8 e 20 caracteres.'),
  acceptWeakPassword: z.boolean(),
  marketingConsent: z.boolean(),
  acceptTerms: z.literal(true, 'É necessário aceitar os Termos e Condições.'),
}).superRefine((value, context) => {
  if (value.recoveryEmail !== value.recoveryEmailConfirmation) {
    context.addIssue({ code: 'custom', path: ['recoveryEmailConfirmation'], message: 'Os e-mails não correspondem.' });
  }
  if (value.password !== value.passwordConfirmation) {
    context.addIssue({ code: 'custom', path: ['passwordConfirmation'], message: 'As senhas não correspondem.' });
  }
});

export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;
