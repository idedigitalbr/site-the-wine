'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Mail } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import {
  requestPasswordRecovery,
  resetCustomerPasswordRequest,
  verifyPasswordRecovery,
} from '@/lib/customer-auth-client';
import {
  isRecoveryPasswordValid,
  parseRecoveryIdentifier,
  RECOVERY_PREFILL_STORAGE_KEY,
} from '@/modules/customer-auth/domain/password-recovery';
import { RecoveryCodeStep } from './RecoveryCodeStep';
import { RecoveryNewPasswordStep } from './RecoveryNewPasswordStep';
import styles from './PasswordRecovery.module.css';

type Step = 'request' | 'verify' | 'reset';

function readStoredRecoveryPrefill(): string {
  if (typeof window === 'undefined') return '';
  try {
    const prefilled = window.sessionStorage.getItem(RECOVERY_PREFILL_STORAGE_KEY);
    if (prefilled) {
      window.sessionStorage.removeItem(RECOVERY_PREFILL_STORAGE_KEY);
      return prefilled;
    }
  } catch {
    // Ignorar caso sessionStorage esteja indisponível
  }
  return '';
}

export function PasswordRecoveryScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState(() => readStoredRecoveryPrefill());
  const [resetToken, setResetToken] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const submitLock = useRef(false);

  async function handleRequestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current) return;
    const parsed = parseRecoveryIdentifier(identifier);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    submitLock.current = true;
    setPending(true);
    setError('');
    setInfo('');
    try {
      await requestPasswordRecovery(identifier);
      setStep('verify');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar o código.');
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }

  async function handleResendCode() {
    if (submitLock.current) return;
    submitLock.current = true;
    setPending(true);
    setError('');
    setInfo('');
    try {
      await requestPasswordRecovery(identifier);
      setInfo('Um novo código foi enviado para o seu e-mail (válido por 10 minutos).');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível reenviar o código.');
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }

  async function handleVerifyCode(code: string) {
    if (submitLock.current) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Digite os 6 números do código de verificação.');
      return;
    }
    submitLock.current = true;
    setPending(true);
    setError('');
    setInfo('');
    try {
      const result = await verifyPasswordRecovery(identifier, code);
      setResetToken(result.resetToken);
      setStep('reset');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Código inválido ou expirado.');
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }

  async function handleResetPassword(newPassword: string, confirmPassword: string) {
    if (submitLock.current) return;
    const validationError = validateNewPasswordClient(newPassword, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }
    submitLock.current = true;
    setPending(true);
    setError('');
    try {
      await resetCustomerPasswordRequest(resetToken, newPassword, confirmPassword);
      router.replace('/acesso?auth=password-reset');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a nova senha.');
      submitLock.current = false;
      setPending(false);
    }
  }

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        {step === 'request' && (
          <RequestCodeCard
            identifier={identifier}
            pending={pending}
            error={error}
            onIdentifierChange={setIdentifier}
            onSubmit={handleRequestCode}
          />
        )}
        {step === 'verify' && (
          <RecoveryCodeStep
            pending={pending}
            error={error}
            info={info}
            onBack={() => { setError(''); setInfo(''); setStep('request'); }}
            onVerify={handleVerifyCode}
            onResend={handleResendCode}
          />
        )}
        {step === 'reset' && (
          <RecoveryNewPasswordStep
            pending={pending}
            error={error}
            onBack={() => { setError(''); setInfo(''); setStep('verify'); }}
            onSubmitNewPassword={handleResetPassword}
          />
        )}
      </main>
      <SiteBehaviorController />
    </div>
  );
}

function validateNewPasswordClient(newPassword: string, confirmPassword: string): string {
  if (!isRecoveryPasswordValid(newPassword)) {
    return 'A nova senha deve atender a todos os 4 requisitos listados abaixo.';
  }
  if (newPassword !== confirmPassword) {
    return 'As senhas digitadas não coincidem.';
  }
  return '';
}

function RequestCodeCard({
  identifier,
  pending,
  error,
  onIdentifierChange,
  onSubmit,
}: {
  identifier: string;
  pending: boolean;
  error: string;
  onIdentifierChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.headerBlock}>
        <p className={styles.eyebrow}>THE WINE EXPERIENCE</p>
        <h1 className={styles.title}>Recuperar sua senha</h1>
        <p className={styles.subtitle}>
          Informe seu e-mail ou CPF para enviarmos um código de recuperação para o e-mail cadastrado.
        </p>
      </div>

      <form className={styles.card} onSubmit={onSubmit} noValidate>
        {error && <div className={styles.alertError} role="alert">{error}</div>}

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="recovery-identifier">E-mail ou CPF</label>
          <div className={styles.inputControl}>
            <span className={styles.inputIcon} aria-hidden="true"><Mail size={18} /></span>
            <input
              id="recovery-identifier"
              type="text"
              autoComplete="username"
              maxLength={254}
              placeholder="Digite seu e-mail ou CPF"
              className={styles.input}
              value={identifier}
              disabled={pending}
              onClick={(event) => event.currentTarget.select()}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => onIdentifierChange(event.target.value)}
            />
          </div>
        </div>

        <button type="submit" className={styles.submitButton} disabled={pending}>
          <span />
          <span>{pending ? 'Enviando…' : 'Enviar código'}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>

        <hr className={styles.divider} />
        <div className={styles.footerLinkWrap}>
          <Link href="/acesso" className={styles.footerLink}>Voltar para o login</Link>
        </div>
      </form>
    </div>
  );
}
