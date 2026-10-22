'use client';

import { ArrowRight, CircleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { isValidCpf } from '@/modules/customer-auth/domain/cpf';
import { birthDateInputToIso } from '@/modules/customer-auth/domain/birth-date-input';
import { isValidBirthDate } from '@/modules/customer-auth/domain/birth-date';
import { isValidCustomerName } from '@/modules/customer-auth/domain/name';
import { assessPassword } from '@/modules/customer-auth/domain/password-strength';
import { isValidRecoveryEmail, normalizeRecoveryEmail } from '@/modules/customer-auth/domain/recovery-email';
import { isSignupPasswordWeak, validateSignupPasswordBasics } from '@/modules/customer-auth/domain/password-policy';
import { todayInSaoPaulo } from '@/modules/customer-auth/domain/customer-auth-schema';
import { signUpCustomer } from '@/lib/customer-auth-client';
import { CustomerTermsModal } from './CustomerTermsModal';
import { CustomerSignupFields, type SignupValues } from './CustomerSignupFields';
import styles from './CustomerAccess.module.css';

type AuthUser = { id: string; name: string };
type Errors = Partial<Record<keyof SignupValues, string>>;

const initialValues: SignupValues = {
  name: '', cpf: '', birthDate: '', recoveryEmail: '', recoveryEmailConfirmation: '', password: '', passwordConfirmation: '',
};

export function CustomerSignupForm({ onSuccess, onModeChange }: { onSuccess: (user: AuthUser) => Promise<void>; onModeChange: () => void }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [passwordFinalized, setPasswordFinalized] = useState(false);
  const [weakPasswordPrompt, setWeakPasswordPrompt] = useState(false);
  const [acceptWeakPassword, setAcceptWeakPassword] = useState(false);
  const [weakPasswordError, setWeakPasswordError] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [serverError, setServerError] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);

  const strength = values.password ? assessPassword(values.password, [values.name, values.cpf, birthDateInputToIso(values.birthDate), values.recoveryEmail]) : null;
  const localWeakPassword = Boolean(strength && isSignupPasswordWeak(values.password, strength.score));
  const showWeakPasswordPrompt = passwordFinalized && (localWeakPassword || weakPasswordPrompt);

  function resetPasswordAcknowledgement() {
    setPasswordFinalized(false);
    setWeakPasswordPrompt(false);
    setAcceptWeakPassword(false);
    setWeakPasswordError('');
    if (serverError === 'Confirme que deseja usar uma senha fraca para continuar.') setServerError('');
  }

  function finalizePassword() {
    setPasswordFinalized(true);
    if (values.password && isSignupPasswordWeak(values.password, assessPassword(values.password, [values.name, values.cpf, birthDateInputToIso(values.birthDate), values.recoveryEmail]).score)) {
      setWeakPasswordPrompt(true);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const nextErrors = validateSignupValues(values);
    setSubmitted(true);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!acceptTerms) {
      setServerError('Aceite os Termos e Condições para continuar.');
      return;
    }
    if (localWeakPassword && !acceptWeakPassword) {
      setPasswordFinalized(true);
      setWeakPasswordPrompt(true);
      setWeakPasswordError('Confirme que deseja usar esta senha para continuar.');
      return;
    }
    await submitSignup(values, acceptWeakPassword);
  }

  async function submitSignup(currentValues: SignupValues, acceptsWeakPassword: boolean) {
    lock.current = true;
    setPending(true);
    setServerError('');
    try {
      const payload = await signUpCustomer({
        ...currentValues,
        birthDate: birthDateInputToIso(currentValues.birthDate),
        recoveryEmail: normalizeRecoveryEmail(currentValues.recoveryEmail),
        recoveryEmailConfirmation: normalizeRecoveryEmail(currentValues.recoveryEmailConfirmation),
        acceptWeakPassword: acceptsWeakPassword,
        marketingConsent,
        acceptTerms: true,
      });
      const user = parseSignupUser(payload);
      setValues(initialValues);
      await onSuccess(user);
    } catch (caught) {
      const code = getErrorCode(caught);
      if (code === 'WEAK_PASSWORD') {
        setPasswordFinalized(true);
        setWeakPasswordPrompt(true);
        setAcceptWeakPassword(false);
        setWeakPasswordError('A senha parece fraca ou já foi exposta. Marque a confirmação para continuar.');
      } else {
        setServerError(caught instanceof Error ? caught.message : 'Não foi possível criar sua conta.');
      }
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <form className={`${styles.authForm} ${styles.signupForm}`} onSubmit={submit} noValidate>
        <div className={styles.headingBlock}><p className={styles.eyebrow}>NOVO CADASTRO</p><h1>Crie sua conta</h1><p>Vamos começar pelos seus dados para continuar com a sua conta.</p></div>
        {serverError && <div className={styles.formError} role="alert"><span>{serverError}</span><button type="button" className={styles.inlineLink} onClick={onModeChange}>Já cadastrou? Tente entrar</button></div>}
        <CustomerSignupFields values={values} setValues={setValues} errors={errors} submitted={submitted} onPasswordChange={resetPasswordAcknowledgement} onPasswordBlur={finalizePassword} />
        <PasswordHelp strength={strength} />
        {showWeakPasswordPrompt && <WeakPasswordAcknowledgement checked={acceptWeakPassword} error={weakPasswordError} onChange={(checked) => { setAcceptWeakPassword(checked); setWeakPasswordError(''); setServerError(''); }} />}
        <label className={styles.checkboxRow}><input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} /><span>Quero receber novidades e experiências do The Wine por e-mail. <small>(opcional)</small></span></label>
        <label className={styles.checkboxRow}><input type="checkbox" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} /><span>Aceito os <button type="button" className={styles.inlineLink} onClick={() => setTermsOpen(true)}>Termos e Condições</button></span></label>
        <button className={styles.submitButton} type="submit" disabled={pending}>{pending ? 'Criando conta…' : <>Criar conta e continuar <ArrowRight aria-hidden="true" size={23} /></>}</button>
        <p className={styles.switchLine}>Já tem conta? <button type="button" className={styles.textLink} onClick={onModeChange}>Entrar</button></p>
      </form>
      <CustomerTermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}

function validateSignupValues(values: SignupValues): Errors {
  const errors: Errors = {};
  addIdentityErrors(errors, values);
  addContactErrors(errors, values);
  addPasswordErrors(errors, values);
  return errors;
}

function addIdentityErrors(errors: Errors, values: SignupValues) {
  const birthDate = birthDateInputToIso(values.birthDate);
  if (!isValidCustomerName(values.name)) errors.name = 'Digite um nome completo válido.';
  if (!isValidCpf(values.cpf)) errors.cpf = 'Confira os 11 números do CPF.';
  if (!birthDate || !isValidBirthDate(birthDate, todayInSaoPaulo())) errors.birthDate = 'Informe uma data válida.';
}

function addContactErrors(errors: Errors, values: SignupValues) {
  if (!isValidRecoveryEmail(values.recoveryEmail)) errors.recoveryEmail = 'Digite um e-mail válido.';
  if (!isValidRecoveryEmail(values.recoveryEmailConfirmation)) errors.recoveryEmailConfirmation = 'Digite um e-mail válido.';
  if (normalizeRecoveryEmail(values.recoveryEmail) !== normalizeRecoveryEmail(values.recoveryEmailConfirmation)) errors.recoveryEmailConfirmation = 'Os e-mails precisam ser iguais.';
}

function addPasswordErrors(errors: Errors, values: SignupValues) {
  if (!validateSignupPasswordBasics(values.password)) errors.password = 'A senha deve ter entre 8 e 20 caracteres.';
  if (values.password !== values.passwordConfirmation) errors.passwordConfirmation = 'As senhas precisam ser iguais.';
}

function PasswordHelp({ strength }: { strength: ReturnType<typeof assessPassword> | null }) {
  return <div className={styles.passwordHelp}><CircleAlert size={17} aria-hidden="true" /><span>{strength && strength.score > 2 ? 'Senha forte.' : 'Use entre 8 e 20 caracteres e evite senhas previsíveis.'}</span></div>;
}

function WeakPasswordAcknowledgement({ checked, error, onChange }: { checked: boolean; error: string; onChange: (checked: boolean) => void }) {
  return <div className={styles.weakPasswordNotice}><label className={styles.weakPasswordLabel}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>Reconheço que esta senha é fraca ou pode ter sido exposta e quero usá-la mesmo assim.</span></label>{error && <p className={styles.weakPasswordError} role="alert">{error}</p>}</div>;
}

function getErrorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? error.code : '';
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
