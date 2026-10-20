'use client';

import { ArrowRight, CircleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { isValidCpf } from '@/modules/customer-auth/domain/cpf';
import { birthDateInputToIso } from '@/modules/customer-auth/domain/birth-date-input';
import { todayInSaoPaulo } from '@/modules/customer-auth/domain/customer-auth-schema';
import { isValidBirthDate } from '@/modules/customer-auth/domain/birth-date';
import { assessPassword } from '@/modules/customer-auth/domain/password-strength';
import { signUpCustomer } from '@/lib/customer-auth-client';
import { CustomerTermsModal } from './CustomerTermsModal';
import { CustomerSignupFields, type SignupValues } from './CustomerSignupFields';
import styles from './CustomerAccess.module.css';

type AuthUser = { id: string; name: string };
type Errors = Partial<Record<keyof SignupValues, string>>;

const initialValues: SignupValues = { name: '', cpf: '', birthDate: '', recoveryEmail: '', recoveryEmailConfirmation: '', password: '', passwordConfirmation: '' };

export function CustomerSignupForm({ onSuccess, onModeChange }: { onSuccess: (user: AuthUser) => Promise<void>; onModeChange: () => void }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [serverError, setServerError] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);

  function validate(): Errors {
    const next: Errors = {};
    const birthDate = birthDateInputToIso(values.birthDate);
    addIdentityErrors(next, values, birthDate);
    addContactErrors(next, values);
    addPasswordErrors(next, values, birthDate);
    return next;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const nextErrors = validate();
    setSubmitted(true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!acceptTerms) { setServerError('Aceite os Termos e Condições para continuar.'); return; }
    lock.current = true;
    setPending(true);
    setServerError('');
    try {
      const payload = await signUpCustomer({ ...values, cpf: values.cpf, birthDate: birthDateInputToIso(values.birthDate), recoveryEmail: values.recoveryEmail.trim().toLowerCase(), recoveryEmailConfirmation: values.recoveryEmailConfirmation.trim().toLowerCase(), acceptWeakPassword: false, marketingConsent, acceptTerms: true });
      const user = parseSignupUser(payload);
      setValues(initialValues);
      await onSuccess(user);
    } catch (caught) {
      setServerError(caught instanceof Error ? caught.message : 'Não foi possível criar sua conta.');
      lock.current = false;
      setPending(false);
    }
  }

  const strength = values.password ? assessPassword(values.password, [values.name, values.cpf, values.recoveryEmail]) : null;
  return (
    <>
      <form className={`${styles.authForm} ${styles.signupForm}`} onSubmit={submit} noValidate>
        <div className={styles.headingBlock}><p className={styles.eyebrow}>NOVO CADASTRO</p><h1>Crie sua conta</h1><p>Vamos começar pelos seus dados para continuar com a sua conta.</p></div>
        {serverError && <div className={styles.formError} role="alert"><span>{serverError}</span><button type="button" className={styles.inlineLink} onClick={onModeChange}>Já cadastrou? Tente entrar</button></div>}
        <CustomerSignupFields values={values} setValues={setValues} errors={errors} submitted={submitted} />
        <div className={styles.passwordHelp}><CircleAlert size={17} aria-hidden="true" /><span>{strength && !strength.weak ? 'Senha forte.' : 'Use pelo menos 15 caracteres e evite senhas previsíveis.'}</span></div>
        <label className={styles.checkboxRow}><input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} /><span>Quero receber novidades e experiências do The Wine por e-mail. <small>(opcional)</small></span></label>
        <label className={styles.checkboxRow}><input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} /><span>Aceito os <button type="button" className={styles.inlineLink} onClick={() => setTermsOpen(true)}>Termos e Condições</button></span></label>
        <button className={styles.submitButton} type="submit" disabled={pending}>{pending ? 'Criando conta…' : <>Criar conta e continuar <ArrowRight aria-hidden="true" size={23} /></>}</button>
        <p className={styles.switchLine}>Já tem conta? <button type="button" className={styles.textLink} onClick={onModeChange}>Entrar</button></p>
      </form>
      <CustomerTermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}

function parseSignupUser(payload: unknown): AuthUser {
  const user = (payload as { user?: unknown }).user;
  if (typeof user !== 'object' || user === null || !isSignupUser(user)) throw new Error('Resposta inválida.');
  return user;
}

function isSignupUser(value: object): value is AuthUser {
  const user = value as Partial<AuthUser>;
  return typeof user.id === 'string' && typeof user.name === 'string';
}

function addIdentityErrors(errors: Errors, values: SignupValues, birthDate: string) {
  if (values.name.trim().length < 2) errors.name = 'Digite seu nome completo.';
  if (!isValidCpf(values.cpf)) errors.cpf = 'Confira os 11 números do CPF.';
  if (!birthDate || !isValidBirthDate(birthDate, todayInSaoPaulo())) errors.birthDate = 'Informe uma data válida.';
}

function addContactErrors(errors: Errors, values: SignupValues) {
  if (!/^\S+@\S+\.\S+$/.test(values.recoveryEmail.trim())) errors.recoveryEmail = 'Digite um e-mail válido.';
  if (values.recoveryEmail.trim().toLowerCase() !== values.recoveryEmailConfirmation.trim().toLowerCase()) errors.recoveryEmailConfirmation = 'Os e-mails precisam ser iguais.';
}

function addPasswordErrors(errors: Errors, values: SignupValues, birthDate: string) {
  if (assessPassword(values.password, [values.name, values.cpf, birthDate, values.recoveryEmail]).weak) errors.password = 'Use pelo menos 15 caracteres e evite senhas previsíveis.';
  if (values.password !== values.passwordConfirmation) errors.passwordConfirmation = 'As senhas precisam ser iguais.';
}
