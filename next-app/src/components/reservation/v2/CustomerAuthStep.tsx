'use client';

import type { FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleAlert, LoaderCircle, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { customerSignupSchema, todayInSaoPaulo } from '@/modules/customer-auth/domain/customer-auth-schema';
import { isValidCpf } from '@/modules/customer-auth/domain/cpf';
import { assessPassword } from '@/modules/customer-auth/domain/password-strength';
import type { CustomerSignupInput } from '@/modules/customer-auth/domain/customer-auth-schema';
import { TermsModal } from './TermsModal';

type CustomerAuthStepProps = { onAuthenticated: () => Promise<boolean> };
type LookupState = 'idle' | 'checking' | 'exists' | 'available' | 'error';
type AuthMode = 'cpf' | 'existing' | 'sign-in' | 'sign-up' | 'continue';
type AuthErrorPayload = { error?: string; message?: string };
type LookupResult = { status: 'exists' | 'available' } | { error: string };
type CustomerSignupFormValues = Omit<CustomerSignupInput, 'acceptTerms'> & { acceptTerms: boolean };

const emptySignup = (cpf: string): CustomerSignupFormValues => ({
  cpf,
  name: '',
  birthDate: '',
  recoveryEmail: '',
  recoveryEmailConfirmation: '',
  password: '',
  passwordConfirmation: '',
  acceptWeakPassword: false,
  marketingConsent: false,
  acceptTerms: false,
});

async function readError(response: Response, fallback: string): Promise<AuthErrorPayload> {
  try {
    const payload = await response.json() as AuthErrorPayload;
    return { ...payload, message: payload.message || fallback };
  } catch {
    return { message: fallback };
  }
}

async function lookupCustomerCpf(cpf: string, signal: AbortSignal): Promise<LookupResult> {
  try {
    const response = await fetch('/api/customer-auth/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf }),
      signal,
    });
    if (!response.ok) {
      const payload = await readError(response, 'Não foi possível consultar agora. Tente novamente.');
      return { error: payload.message ?? 'Não foi possível consultar agora. Tente novamente.' };
    }
    const payload = await response.json() as { status?: string };
    if (payload.status === 'exists' || payload.status === 'available') return { status: payload.status };
    return { error: 'Não foi possível interpretar a consulta. Tente novamente.' };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { error: 'aborted' };
    return { error: 'Não foi possível consultar agora. Tente novamente.' };
  }
}

function useCpfLookup(enabled: boolean, onResolved: (status: 'exists' | 'available') => void) {
  const [cpf, setCpf] = useState('');
  const [state, setState] = useState<LookupState>('idle');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || cpf.length !== 11 || !isValidCpf(cpf)) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState('checking');
      setError('');
      void lookupCustomerCpf(cpf, controller.signal).then((result) => {
        if (cancelled) return;
        if ('error' in result) {
          if (result.error === 'aborted') return;
          setError(result.error);
          setState('error');
          return;
        }
        setState(result.status);
        onResolved(result.status);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, cpf, enabled, onResolved]);

  const changeCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    setCpf(digits);
    setError('');
    setState('idle');
  };

  return { cpf, changeCpf, state, error, retry: () => setAttempt((value) => value + 1), clear: () => changeCpf('') };
}

function cpfDescription(cpf: string, invalid: boolean): string {
  if (!cpf) return 'Digite os 11 números do seu CPF para continuar.';
  if (cpf.length < 11) return 'O CPF precisa ter 11 números.';
  if (invalid) return 'Confira os dígitos do CPF.';
  return 'Usaremos o CPF para localizar ou criar sua conta.';
}

function AuthField({
  id,
  label,
  icon: Icon,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon aria-hidden="true" size={16} strokeWidth={1.7} />{label}
      </label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1.5 text-sm text-status-danger">{error}</p>}
    </div>
  );
}

function CpfEntry({
  cpf,
  onChange,
  state,
  error,
  onRetry,
}: {
  cpf: string;
  onChange: (value: string) => void;
  state: LookupState;
  error: string;
  onRetry: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const invalid = cpf.length === 11 && !isValidCpf(cpf);
  const help = cpfDescription(cpf, invalid);

  const clear = () => {
    onChange('');
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div>
      <label htmlFor="reservation-cpf" className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><UserRound aria-hidden="true" size={16} strokeWidth={1.7} /> CPF</label>
      <div className="relative">
        <input ref={inputRef} id="reservation-cpf" value={cpf} onChange={(event) => onChange(event.target.value)} className="reservation-input pr-12" placeholder="00000000000" inputMode="numeric" autoComplete="off" maxLength={11} aria-describedby="reservation-cpf-help" aria-invalid={invalid} />
        {cpf && <button type="button" onClick={clear} aria-label="Limpar CPF" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><X aria-hidden="true" size={16} /></button>}
      </div>
      <p id="reservation-cpf-help" className={`mt-1.5 text-sm ${invalid ? 'text-status-danger' : 'text-muted'}`}>{help}</p>
      {state === 'checking' && <p className="mt-2 flex items-center gap-2 text-sm text-muted" role="status"><LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> Consultando seu CPF…</p>}
      {state === 'error' && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger"><span>{error}</span><button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">Tentar novamente</button></div>}
    </div>
  );
}

function CpfStep({
  cpf,
  onChange,
  state,
  error,
  onRetry,
}: {
  cpf: string;
  onChange: (value: string) => void;
  state: LookupState;
  error: string;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-5" aria-labelledby="reservation-cpf-title">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Acesso rápido</p><h2 id="reservation-cpf-title" className="mt-1 font-display text-2xl text-foreground">Vamos encontrar sua conta</h2><p className="mt-2 text-sm leading-relaxed text-muted">Informe seu CPF para acessar sua conta ou criar seu cadastro e continuar com a reserva.</p></div>
      <CpfEntry cpf={cpf} onChange={onChange} state={state} error={error} onRetry={onRetry} />
      <p className="text-xs leading-relaxed text-muted">Seus dados de acesso ficam protegidos e não são exibidos na confirmação da reserva.</p>
    </section>
  );
}

function ExistingAccountPrompt({ onSignIn, onChangeCpf }: { onSignIn: () => void; onChangeCpf: () => void }) {
  return (
    <section className="space-y-5" aria-labelledby="existing-account-title">
      <div className="rounded-[var(--radius-md)] border border-primary/35 bg-primary/10 p-5 sm:p-6">
        <h2 id="existing-account-title" className="font-display text-2xl text-foreground">Este CPF já possui cadastro. Deseja acessar esta conta?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">Entre para seguir com a reserva usando os dados da sua conta.</p>
        <button type="button" onClick={onSignIn} className="reservation-primary-button mt-5 w-full justify-center sm:w-auto"><LockKeyhole aria-hidden="true" size={16} /> Acessar conta</button>
      </div>
      <button type="button" onClick={onChangeCpf} className="inline-flex items-center gap-2 text-sm text-muted underline underline-offset-4 hover:text-foreground"><ArrowLeft aria-hidden="true" size={15} /> Trocar CPF</button>
    </section>
  );
}

function SignInForm({ cpf, onBack, onAccessEstablished }: { cpf: string; onBack: () => void; onAccessEstablished: () => Promise<boolean> }) {
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/customer-auth/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, password }),
      });
      if (!response.ok) {
        const payload = await readError(response, 'Não foi possível acessar agora. Tente novamente.');
        setMessage(payload.message ?? 'Não foi possível acessar agora. Tente novamente.');
        return;
      }
      setPassword('');
      await onAccessEstablished();
    } catch {
      setMessage('Não foi possível acessar agora. Verifique sua conexão e tente novamente.');
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Acessar conta</p><p className="mt-1 text-sm text-muted">CPF: <span className="font-medium text-foreground">{cpf}</span></p></div>
      <AuthField id="reservation-password" label="Senha" icon={LockKeyhole}>
        <input id="reservation-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setMessage(''); }} autoComplete="current-password" maxLength={128} className="reservation-input" aria-describedby="reservation-password-help" required />
        <p id="reservation-password-help" className="mt-1.5 text-xs text-muted">Digite a senha da conta associada a este CPF.</p>
      </AuthField>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/recuperar-senha" className="text-sm text-primary underline underline-offset-4 hover:text-primary-hover">Esqueci minha senha</Link>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted underline underline-offset-4 hover:text-foreground"><ArrowLeft aria-hidden="true" size={15} /> Trocar CPF</button>
      </div>
      {message && <p role="alert" className="rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{message}</p>}
      <button type="submit" disabled={pending || password.length === 0} className="reservation-primary-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-55">{pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <ArrowRight aria-hidden="true" size={16} />} {pending ? 'Acessando…' : 'Entrar e continuar'}</button>
    </form>
  );
}

type SignupField = keyof CustomerSignupFormValues;
type SignupErrors = Record<string, string>;
type SignupTouched = Partial<Record<SignupField, boolean>>;

function visibleSignupError(key: SignupField, errors: SignupErrors, touched: SignupTouched) {
  return touched[key] ? errors[key] : undefined;
}

function SignupInput({
  id,
  label,
  icon,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  maxLength,
  max,
  autoComplete,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  type?: 'text' | 'email' | 'date' | 'password';
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  maxLength?: number;
  max?: string;
  autoComplete?: string;
}) {
  return (
    <AuthField id={id} label={label} icon={icon} error={error}>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} max={max} maxLength={maxLength} autoComplete={autoComplete} className="reservation-input" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
    </AuthField>
  );
}

function SignupIdentityFields({
  signup,
  errors,
  touched,
  onChange,
  onTouch,
}: {
  signup: CustomerSignupFormValues;
  errors: SignupErrors;
  touched: SignupTouched;
  onChange: <K extends SignupField>(key: K, value: CustomerSignupFormValues[K]) => void;
  onTouch: (key: SignupField) => void;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <SignupInput id="signup-name" label="Nome completo" icon={UserRound} value={signup.name} onChange={(value) => onChange('name', value)} onBlur={() => onTouch('name')} error={visibleSignupError('name', errors, touched)} maxLength={160} autoComplete="name" />
        <SignupInput id="signup-birth-date" label="Data de nascimento" icon={CalendarDays} type="date" value={signup.birthDate} onChange={(value) => onChange('birthDate', value)} onBlur={() => onTouch('birthDate')} error={visibleSignupError('birthDate', errors, touched)} max={todayInSaoPaulo()} autoComplete="bday" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SignupInput id="signup-email" label="E-mail de recuperação" icon={Mail} type="email" value={signup.recoveryEmail} onChange={(value) => onChange('recoveryEmail', value)} onBlur={() => onTouch('recoveryEmail')} error={visibleSignupError('recoveryEmail', errors, touched)} maxLength={254} autoComplete="email" />
        <SignupInput id="signup-email-confirmation" label="Confirme o e-mail" icon={Mail} type="email" value={signup.recoveryEmailConfirmation} onChange={(value) => onChange('recoveryEmailConfirmation', value)} onBlur={() => onTouch('recoveryEmailConfirmation')} error={visibleSignupError('recoveryEmailConfirmation', errors, touched)} maxLength={254} autoComplete="off" />
      </div>
    </>
  );
}

function SignupPasswordFields({
  signup,
  errors,
  touched,
  assessment,
  onChange,
  onTouch,
}: {
  signup: CustomerSignupFormValues;
  errors: SignupErrors;
  touched: SignupTouched;
  assessment: ReturnType<typeof assessPassword> | null;
  onChange: <K extends SignupField>(key: K, value: CustomerSignupFormValues[K]) => void;
  onTouch: (key: SignupField) => void;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <SignupInput id="signup-password" label="Senha" icon={LockKeyhole} type="password" value={signup.password} onChange={(value) => onChange('password', value)} onBlur={() => onTouch('password')} error={visibleSignupError('password', errors, touched)} maxLength={128} autoComplete="new-password" />
        <SignupInput id="signup-password-confirmation" label="Confirme a senha" icon={LockKeyhole} type="password" value={signup.passwordConfirmation} onChange={(value) => onChange('passwordConfirmation', value)} onBlur={() => onTouch('passwordConfirmation')} error={visibleSignupError('passwordConfirmation', errors, touched)} maxLength={128} autoComplete="new-password" />
      </div>
      <div id="signup-password-guidance" className="-mt-3 rounded-[var(--radius-sm)] border border-border bg-surface-muted/50 p-3 text-xs leading-relaxed text-muted">
        <p>Consideramos fraca uma senha com menos de 15 caracteres ou nota de 0 a 2 no estimador de segurança. A senha é avaliada somente neste site.</p>
        {assessment && <p className={`mt-1.5 ${assessment.weak ? 'text-primary' : 'text-status-success'}`}>{assessment.weak ? 'Senha fraca.' : 'Senha forte.'} {assessment.warning}</p>}
      </div>
      {assessment?.weak && <label className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-primary/30 bg-primary/10 p-3 text-sm text-foreground"><input type="checkbox" checked={signup.acceptWeakPassword} onChange={(event) => onChange('acceptWeakPassword', event.target.checked)} className="reservation-checkbox mt-0.5" /><span>Entendo que esta senha é fraca e quero continuar mesmo assim.</span></label>}
    </>
  );
}

function SignupConsents({
  signup,
  onChange,
  termsLinkRef,
  onOpenTerms,
}: {
  signup: CustomerSignupFormValues;
  onChange: <K extends SignupField>(key: K, value: CustomerSignupFormValues[K]) => void;
  termsLinkRef: React.RefObject<HTMLButtonElement | null>;
  onOpenTerms: () => void;
}) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <label className="flex items-start gap-3 text-sm leading-relaxed text-muted"><input type="checkbox" checked={signup.marketingConsent} onChange={(event) => onChange('marketingConsent', event.target.checked)} className="reservation-checkbox mt-0.5" /><span>Quero receber novidades e experiências do The Wine por e-mail. (opcional)</span></label>
      <div className="flex items-start gap-2 text-sm leading-relaxed text-muted">
        <input id="signup-accept-terms" type="checkbox" checked={signup.acceptTerms} onChange={(event) => onChange('acceptTerms', event.target.checked)} className="reservation-checkbox mt-0.5" />
        <div><label htmlFor="signup-accept-terms">Aceito os </label><button ref={termsLinkRef} type="button" onClick={onOpenTerms} className="text-primary underline underline-offset-4 hover:text-primary-hover">Termos e Condições</button>{!signup.acceptTerms && <p className="mt-1 text-sm text-status-danger">Aceite os Termos e Condições para criar a conta.</p>}</div>
      </div>
    </div>
  );
}

function SignupErrorNotice({ message, cpfConflict }: { message: string; cpfConflict: boolean }) {
  if (!message) return null;
  return <div role="alert" className="rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger"><p>{message}</p>{cpfConflict && <button type="button" onClick={() => window.location.reload()} className="mt-2 font-semibold underline underline-offset-4">Recarregar página</button>}</div>;
}

function SignupSubmitButton({ disabled, pending }: { disabled: boolean; pending: boolean }) {
  return <button type="submit" disabled={disabled || pending} className="reservation-primary-button w-full justify-center transition enabled:hover:shadow-[0_0_24px_rgba(214,180,91,.24)] disabled:cursor-not-allowed disabled:opacity-55">{pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <ArrowRight aria-hidden="true" size={16} />} {pending ? 'Criando conta…' : 'Criar conta e continuar'}</button>;
}

function SignUpForm({ cpf, onAccessEstablished }: { cpf: string; onAccessEstablished: () => Promise<boolean> }) {
  const [signup, setSignup] = useState<CustomerSignupFormValues>(() => emptySignup(cpf));
  const [touched, setTouched] = useState<Partial<Record<keyof CustomerSignupFormValues, boolean>>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [cpfConflict, setCpfConflict] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [fieldsVisited, setFieldsVisited] = useState(false);
  const termsLinkRef = useRef<HTMLButtonElement>(null);
  const lock = useRef(false);
  const closeTerms = useCallback(() => setTermsOpen(false), []);

  const errors = useMemo(() => {
    const result = customerSignupSchema.safeParse(signup);
    return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])) as Record<string, string>;
  }, [signup]);
  const passwordAssessment = useMemo(() => signup.password
    ? assessPassword(signup.password, [signup.name, signup.cpf, signup.birthDate, signup.recoveryEmail])
    : null, [signup.password, signup.name, signup.cpf, signup.birthDate, signup.recoveryEmail]);
  const valid = customerSignupSchema.safeParse(signup).success && (!passwordAssessment?.weak || signup.acceptWeakPassword);

  const change = <K extends keyof CustomerSignupFormValues>(key: K, value: CustomerSignupFormValues[K]) => {
    setSignup((current) => ({ ...current, [key]: value, ...(key === 'password' ? { acceptWeakPassword: false } : {}) }));
    setMessage('');
  };

  const touch = (key: keyof CustomerSignupFormValues) => {
    setTouched((current) => ({ ...current, [key]: true }));
    setFieldsVisited(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldsVisited(true);
    if (!valid || lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/customer-auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup),
      });
      if (!response.ok) {
        const payload = await readError(response, 'Não foi possível criar a conta. Confira os dados e tente novamente.');
        setMessage(payload.message ?? 'Não foi possível criar a conta. Confira os dados e tente novamente.');
        setCpfConflict(payload.error === 'CPF_ALREADY_REGISTERED');
        return;
      }
      setCpfConflict(false);
      setSignup(emptySignup(''));
      await onAccessEstablished();
    } catch {
      setMessage('Não foi possível criar a conta agora. Seus dados continuam nesta tela para você tentar novamente.');
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  useEffect(() => {
    if (!termsOpen) return;
    const termsLink = termsLinkRef.current;
    return () => termsLink?.focus();
  }, [termsOpen]);

  return (
    <>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Novo cadastro</p><h2 className="mt-1 font-display text-2xl text-foreground">Seus dados de acesso</h2></div><span className="text-sm text-muted">CPF: <span className="font-medium text-foreground">{cpf}</span></span></div>
        <p className="text-sm leading-relaxed text-muted">Este CPF ainda não tem conta. Crie seu acesso para seguir com a reserva.</p>
        <SignupIdentityFields signup={signup} errors={errors} touched={touched} onChange={change} onTouch={touch} />
        <SignupPasswordFields signup={signup} errors={errors} touched={touched} assessment={passwordAssessment} onChange={change} onTouch={touch} />
        {fieldsVisited && !valid && <p className="rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger" role="status">Preencha os campos obrigatórios, corrija os itens destacados e aceite os termos para criar sua conta.</p>}
        <SignupConsents signup={signup} onChange={change} termsLinkRef={termsLinkRef} onOpenTerms={() => setTermsOpen(true)} />
        <SignupErrorNotice message={message} cpfConflict={cpfConflict} />
        <SignupSubmitButton disabled={!valid} pending={pending} />
      </form>
      <TermsModal open={termsOpen} onClose={closeTerms} />
    </>
  );
}

function ContinuePanel({ busy, message, onContinue }: { busy: boolean; message: string; onContinue: () => void }) {
  return (
    <section className="space-y-5" aria-labelledby="auth-continue-title">
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-primary/30 bg-primary/10 p-4"><Check aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={20} /><div><h2 id="auth-continue-title" className="font-semibold text-foreground">Acesso confirmado</h2><p className="mt-1 text-sm leading-relaxed text-muted">Sua conta está pronta. Vamos continuar com a escolha da data.</p></div></div>
      {message && <p role="alert" className="text-sm text-status-danger">{message}</p>}
      <button type="button" disabled={busy} onClick={onContinue} className="reservation-primary-button w-full justify-center disabled:cursor-wait disabled:opacity-60">{busy ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <ArrowRight aria-hidden="true" size={16} />} {busy ? 'Preparando…' : 'Continuar para a reserva'}</button>
    </section>
  );
}

export function CustomerAuthStep({ onAuthenticated }: CustomerAuthStepProps) {
  const [mode, setMode] = useState<AuthMode>('cpf');
  const [continueMessage, setContinueMessage] = useState('');
  const [continueBusy, setContinueBusy] = useState(false);
  const continuationLock = useRef(false);
  const resolveLookup = useCallback((status: 'exists' | 'available') => {
    setMode(status === 'exists' ? 'existing' : 'sign-up');
  }, []);
  const lookup = useCpfLookup(mode === 'cpf', resolveLookup);

  const backToCpf = () => {
    setMode('cpf');
    setContinueMessage('');
    lookup.retry();
  };

  const finishAccess = async () => {
    setMode('continue');
    setContinueBusy(true);
    setContinueMessage('');
    try {
      const ready = await onAuthenticated();
      if (!ready) setContinueMessage('Seu acesso foi reconhecido, mas não conseguimos preparar a reserva. Tente novamente.');
      return ready;
    } finally {
      setContinueBusy(false);
    }
  };

  const continueReservation = async () => {
    if (continuationLock.current) return;
    continuationLock.current = true;
    setContinueBusy(true);
    setContinueMessage('');
    try {
      if (!await onAuthenticated()) setContinueMessage('Não conseguimos preparar a reserva. Tente novamente.');
    } finally {
      continuationLock.current = false;
      setContinueBusy(false);
    }
  };

  if (mode === 'continue') return <ContinuePanel busy={continueBusy} message={continueMessage} onContinue={continueReservation} />;
  if (mode === 'existing') return <ExistingAccountPrompt onSignIn={() => setMode('sign-in')} onChangeCpf={backToCpf} />;
  if (mode === 'sign-in') return <SignInForm cpf={lookup.cpf} onBack={backToCpf} onAccessEstablished={finishAccess} />;
  if (mode === 'sign-up') return <SignUpForm cpf={lookup.cpf} onAccessEstablished={finishAccess} />;
  return <CpfStep cpf={lookup.cpf} onChange={lookup.changeCpf} state={lookup.state} error={lookup.error} onRetry={lookup.retry} />;
}
