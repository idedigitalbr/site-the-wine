'use client';

import { CalendarDays, LockKeyhole, Mail, UserRound } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { formatBirthDateInput } from '@/modules/customer-auth/domain/birth-date-input';
import { sanitizeCpfInput } from '@/modules/customer-auth/domain/cpf';
import { normalizeNameInput } from '@/modules/customer-auth/domain/name';
import { CUSTOMER_SIGNUP_PASSWORD_MAX_LENGTH } from '@/modules/customer-auth/domain/password-policy';
import { AuthField } from './AuthField';
import styles from './CustomerAccess.module.css';

export type SignupValues = {
  name: string;
  cpf: string;
  birthDate: string;
  recoveryEmail: string;
  recoveryEmailConfirmation: string;
  password: string;
  passwordConfirmation: string;
};

type SignupErrors = Partial<Record<keyof SignupValues, string>>;

export function CustomerSignupFields({
  values,
  setValues,
  errors,
  submitted,
  onPasswordChange,
  onPasswordBlur,
}: {
  values: SignupValues;
  setValues: Dispatch<SetStateAction<SignupValues>>;
  errors: SignupErrors;
  submitted: boolean;
  onPasswordChange?: () => void;
  onPasswordBlur?: () => void;
}) {
  const update = (field: keyof SignupValues, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const errorFor = (field: keyof SignupValues) => submitted ? errors[field] : undefined;
  const limitPasswordInput = (value: string) => Array.from(value).slice(0, CUSTOMER_SIGNUP_PASSWORD_MAX_LENGTH).join('');
  const sanitizeEmailInput = (value: string) => value.replace(/[\p{Cc}\p{Cf}\s]/gu, '');
  return (
    <div className={styles.signupFields}>
      <AuthField id="signup-name" label="Nome completo" placeholder="Digite seu nome completo" autoComplete="name" maxLength={160} value={values.name} onChange={(event) => update('name', normalizeNameInput(event.target.value))} error={errorFor('name')} icon={<UserRound size={20} />} />
      <div className={styles.signupGrid}>
        <AuthField id="signup-cpf" label="CPF" placeholder="Digite seu CPF" inputMode="numeric" autoComplete="username" maxLength={11} value={values.cpf} onChange={(event) => update('cpf', sanitizeCpfInput(event.target.value))} error={errorFor('cpf')} icon={<UserRound size={20} />} />
        <AuthField id="signup-birth-date" label="Data de nascimento" placeholder="DD/MM/AAAA" inputMode="numeric" autoComplete="bday" maxLength={10} value={values.birthDate} onChange={(event) => update('birthDate', formatBirthDateInput(event.target.value))} error={errorFor('birthDate')} icon={<CalendarDays size={20} />} />
        <AuthField id="signup-email" label="E-mail de recuperação" placeholder="Digite seu e-mail" type="email" autoComplete="email" maxLength={254} value={values.recoveryEmail} onChange={(event) => update('recoveryEmail', sanitizeEmailInput(event.target.value))} error={errorFor('recoveryEmail')} icon={<Mail size={20} />} />
        <AuthField id="signup-email-confirmation" label="Confirme o e-mail" placeholder="Confirme seu e-mail" type="email" autoComplete="email" maxLength={254} value={values.recoveryEmailConfirmation} onChange={(event) => update('recoveryEmailConfirmation', sanitizeEmailInput(event.target.value))} error={errorFor('recoveryEmailConfirmation')} icon={<Mail size={20} />} />
        <AuthField id="signup-password" label="Senha" placeholder="Digite sua senha" type="password" autoComplete="new-password" value={values.password} onChange={(event) => { update('password', limitPasswordInput(event.target.value)); onPasswordChange?.(); }} onBlur={onPasswordBlur} error={errorFor('password')} togglePassword icon={<LockKeyhole size={20} />} />
        <AuthField id="signup-password-confirmation" label="Confirme a senha" placeholder="Confirme sua senha" type="password" autoComplete="new-password" value={values.passwordConfirmation} onChange={(event) => update('passwordConfirmation', limitPasswordInput(event.target.value))} error={errorFor('passwordConfirmation')} togglePassword icon={<LockKeyhole size={20} />} />
      </div>
    </div>
  );
}
