'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { RECOVERY_CODE_LENGTH } from '@/modules/customer-auth/domain/password-recovery';
import styles from './PasswordRecovery.module.css';

type Props = {
  pending: boolean;
  error: string;
  info: string;
  onBack: () => void;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
};

export function RecoveryCodeStep({ pending, error, info, onBack, onVerify, onResend }: Props) {
  const [digits, setDigits] = useState<string[]>(() => Array(RECOVERY_CODE_LENGTH).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  function focusBox(index: number) {
    const target = inputRefs.current[index];
    if (target) target.focus();
  }

  function handleDigitChange(index: number, rawValue: string) {
    const cleanDigit = rawValue.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = cleanDigit;
    setDigits(next);
    if (cleanDigit && index < RECOVERY_CODE_LENGTH - 1) {
      focusBox(index + 1);
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      focusBox(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) focusBox(index - 1);
    if (event.key === 'ArrowRight' && index < RECOVERY_CODE_LENGTH - 1) focusBox(index + 1);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, RECOVERY_CODE_LENGTH);
    if (!pasted) return;
    const next = Array.from({ length: RECOVERY_CODE_LENGTH }, (_, idx) => pasted[idx] ?? '');
    setDigits(next);
    focusBox(Math.min(pasted.length, RECOVERY_CODE_LENGTH - 1));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerify(digits.join(''));
  }

  async function handleResendClick() {
    setDigits(Array(RECOVERY_CODE_LENGTH).fill(''));
    await onResend();
    focusBox(0);
  }

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backButton} onClick={onBack} disabled={pending}>
        <ArrowLeft size={16} aria-hidden="true" /> Voltar
      </button>
      <div className={styles.headerBlock}>
        <p className={styles.eyebrow}>THE WINE EXPERIENCE</p>
        <h1 className={styles.title}>Digite o código</h1>
        <p className={styles.subtitle}>
          Enviamos um código de verificação para o seu e-mail.<br />
          Digite o código abaixo para redefinir sua senha.
        </p>
        <p className={styles.expiryBadge}>
          O código expira em 10 minutos. Após esse prazo, clique em Reenviar código.
        </p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        {error && <div className={styles.alertError} role="alert">{error}</div>}
        {info && !error && <div className={styles.alertInfo} role="status">{info}</div>}

        <div className={styles.fieldGroup}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="recovery-otp-0">Código de verificação</label>
            <div className={styles.resendBox}>
              <span className={styles.resendPrompt}>Não recebeu o código?</span>
              <button
                type="button"
                className={styles.resendButton}
                onClick={() => void handleResendClick()}
                disabled={pending}
              >
                Reenviar código
              </button>
            </div>
          </div>

          <div className={styles.otpGrid}>
            {digits.map((digit, index) => (
              <input
                key={`otp-${index}`}
                id={`recovery-otp-${index}`}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={1}
                placeholder="—"
                aria-label={`Dígito ${index + 1} do código`}
                className={styles.otpInput}
                value={digit}
                disabled={pending}
                onChange={(event) => handleDigitChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
              />
            ))}
          </div>
        </div>

        <button type="submit" className={styles.submitButton} disabled={pending}>
          <span />
          <span>{pending ? 'Verificando…' : 'Verificar código'}</span>
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
