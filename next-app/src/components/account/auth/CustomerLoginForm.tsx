'use client';

import Link from 'next/link';
import { ArrowRight, CreditCard, LockKeyhole } from 'lucide-react';
import { useRef, useState } from 'react';
import { isValidCpf, sanitizeCpfInput } from '@/modules/customer-auth/domain/cpf';
import { RECOVERY_PREFILL_STORAGE_KEY } from '@/modules/customer-auth/domain/password-recovery';
import { getCustomerSession, signInCustomer } from '@/lib/customer-auth-client';
import { AuthField } from './AuthField';
import styles from './CustomerAccess.module.css';

type AuthUser = { id: string; name: string };

function persistCpfPrefillForRecovery(cpf: string) {
  try {
    if (cpf.trim()) {
      window.sessionStorage.setItem(RECOVERY_PREFILL_STORAGE_KEY, cpf.trim());
    } else {
      window.sessionStorage.removeItem(RECOVERY_PREFILL_STORAGE_KEY);
    }
  } catch {
    // Ignorar bloqueio de storage do navegador
  }
}

export function CustomerLoginForm({
  onSuccess,
  onModeChange,
  notice,
}: {
  onSuccess: (user: AuthUser) => Promise<void>;
  onModeChange: () => void;
  notice?: string;
}) {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitLock = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const normalizedCpf = sanitizeCpfInput(cpf);
    const validationError = validateLogin(normalizedCpf, password);
    if (validationError) { setError(validationError); return; }
    submitLock.current = true;
    setPending(true);
    setError('');
    try {
      const payload = await signInCustomer(normalizedCpf, password);
      const user = parseAuthUser(payload);
      setPassword('');
      await onSuccess(user);
    } catch (caught) {
      setPassword('');
      setError(caught instanceof Error ? caught.message : 'Não foi possível entrar. Tente novamente.');
      submitLock.current = false;
      setPending(false);
    }
  }

  return (
    <form className={styles.authForm} onSubmit={submit} noValidate>
      <div className={styles.headingBlock}><p className={styles.eyebrow}>BEM-VINDO(A) DE VOLTA</p><h1>Acesse sua conta</h1><p>Entre na sua conta e continue desfrutando de experiências exclusivas no The Wine Experience.</p></div>
      {notice && !error && <div className={styles.formSuccess} role="status">{notice}</div>}
      {error && <div className={styles.formError} role="alert">{error}</div>}
      <AuthField id="login-cpf" label="CPF" placeholder="Digite seu CPF" inputMode="numeric" autoComplete="username" maxLength={32} value={cpf} onChange={(event) => setCpf(sanitizeCpfInput(event.target.value))} icon={<CreditCard size={20} />} />
      <AuthField id="login-password" label="Senha" placeholder="Digite sua senha" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} togglePassword icon={<LockKeyhole size={20} />} />
      <div className={styles.formLinks}><button className={styles.textLink} type="button" onClick={onModeChange}>Não tem conta? Cadastre-se</button><Link className={styles.textLink} href="/recuperar-senha" onClick={() => persistCpfPrefillForRecovery(cpf)}>Esqueci minha senha</Link></div>
      <button className={styles.submitButton} type="submit" disabled={pending}>{pending ? 'Entrando…' : <><ArrowRight aria-hidden="true" size={24} /> Entrar</>}</button>
    </form>
  );
}

function validateLogin(cpf: string, password: string): string {
  if (!isValidCpf(cpf)) return 'Confira os 11 números do CPF.';
  if (!password || password.length > 128) return 'Digite sua senha.';
  return '';
}

function parseAuthUser(payload: unknown): AuthUser {
  const user = (payload as { user?: unknown }).user;
  if (typeof user !== 'object' || user === null || !isAuthUser(user)) throw new Error('Resposta inválida.');
  return user;
}

function isAuthUser(value: object): value is AuthUser {
  const user = value as Partial<AuthUser>;
  return typeof user.id === 'string' && typeof user.name === 'string';
}
