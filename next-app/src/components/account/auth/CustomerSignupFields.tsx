'use client';

import { CalendarDays, LockKeyhole, Mail, UserRound } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { formatBirthDateInput } from '@/modules/customer-auth/domain/birth-date-input';
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
}: {
  values: SignupValues;
  setValues: Dispatch<SetStateAction<SignupValues>>;
  errors: SignupErrors;
  submitted: boolean;
}) {
  const update = (field: keyof SignupValues, value: string) => setValues((current) => ({ ...current, [field]: value }));
  const errorFor = (field: keyof SignupValues) => submitted ? errors[field] : undefined;
  return (
    <div className={styles.signupFields}>
      <AuthField id="signup-name" label="Nome completo" placeholder="Digite seu nome completo" autoComplete="name" value={values.name} onChange={(event) => update('name', event.target.value)} error={errorFor('name')} icon={<UserRound size={20} />} />
      <div className={styles.signupGrid}>
        <AuthField id="signup-cpf" label="CPF" placeholder="Digite seu CPF" inputMode="numeric" autoComplete="username" maxLength={32} value={values.cpf} onChange={(event) => update('cpf', event.target.value.replace(/\D/g, '').slice(0, 11))} error={errorFor('cpf')} icon={<UserRound size={20} />} />
        <AuthField id="signup-birth-date" label="Data de nascimento" placeholder="DD/MM/AAAA" inputMode="numeric" autoComplete="bday" maxLength={10} value={values.birthDate} onChange={(event) => update('birthDate', formatBirthDateInput(event.target.value))} error={errorFor('birthDate')} icon={<CalendarDays size={20} />} />
        <AuthField id="signup-email" label="E-mail de recuperação" placeholder="Digite seu e-mail" type="email" autoComplete="email" value={values.recoveryEmail} onChange={(event) => update('recoveryEmail', event.target.value)} error={errorFor('recoveryEmail')} icon={<Mail size={20} />} />
        <AuthField id="signup-email-confirmation" label="Confirme o e-mail" placeholder="Confirme seu e-mail" type="email" autoComplete="email" value={values.recoveryEmailConfirmation} onChange={(event) => update('recoveryEmailConfirmation', event.target.value)} error={errorFor('recoveryEmailConfirmation')} icon={<Mail size={20} />} />
        <AuthField id="signup-password" label="Senha" placeholder="Digite sua senha" type="password" autoComplete="new-password" value={values.password} onChange={(event) => update('password', event.target.value)} error={errorFor('password')} togglePassword icon={<LockKeyhole size={20} />} />
        <AuthField id="signup-password-confirmation" label="Confirme a senha" placeholder="Confirme sua senha" type="password" autoComplete="new-password" value={values.passwordConfirmation} onChange={(event) => update('passwordConfirmation', event.target.value)} error={errorFor('passwordConfirmation')} togglePassword icon={<LockKeyhole size={20} />} />
      </div>
    </div>
  );
}
