import { z } from 'zod';
import { isValidCpf } from './cpf';
import { isValidBirthDate } from './birth-date';
import { validatePasswordBasics } from './password-policy';

export function normalizeRecoveryEmail(value: string): string {
  return value.trim().toLowerCase();
}

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
  name: z.string().trim().min(2, 'Informe seu nome completo.').max(160, 'Use até 160 caracteres.'),
  birthDate: z.string().refine((value) => isValidBirthDate(value, todayInSaoPaulo()), 'Informe uma data válida, que não seja futura.'),
  recoveryEmail: z.string().trim().max(254, 'Use até 254 caracteres.')
    .pipe(z.email('Informe um e-mail válido.')),
  recoveryEmailConfirmation: z.string().trim().pipe(z.email('Confirme o e-mail.')),
  password: z.string().refine(validatePasswordBasics, 'A senha não pode estar vazia ou conter apenas espaços e deve ter até 128 caracteres.'),
  passwordConfirmation: z.string(),
  acceptWeakPassword: z.boolean(),
  marketingConsent: z.boolean(),
  acceptTerms: z.literal(true, 'É necessário aceitar os Termos e Condições.'),
}).superRefine((value, context) => {
  if (normalizeRecoveryEmail(value.recoveryEmail) !== normalizeRecoveryEmail(value.recoveryEmailConfirmation)) {
    context.addIssue({ code: 'custom', path: ['recoveryEmailConfirmation'], message: 'Os e-mails não correspondem.' });
  }
  if (value.password !== value.passwordConfirmation) {
    context.addIssue({ code: 'custom', path: ['passwordConfirmation'], message: 'As senhas não correspondem.' });
  }
});

export type CustomerSignupInput = z.infer<typeof customerSignupSchema>;
