'use client';

import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { evaluateRecoveryPasswordRules } from '@/modules/customer-auth/domain/password-recovery';
import styles from './PasswordRecovery.module.css';

type Props = {
  pending: boolean;
  error: string;
  onBack: () => void;
  onSubmitNewPassword: (newPassword: string, confirmPassword: string) => Promise<void>;
};

export function RecoveryNewPasswordStep({ pending, error, onBack, onSubmitNewPassword }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const rules = evaluateRecoveryPasswordRules(newPassword);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmitNewPassword(newPassword, confirmPassword);
  }

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backButton} onClick={onBack} disabled={pending}>
        <ArrowLeft size={16} aria-hidden="true" /> Voltar
      </button>
      <div className={styles.headerBlock}>
        <p className={styles.eyebrow}>THE WINE EXPERIENCE</p>
        <h1 className={styles.title}>Crie uma nova senha</h1>
        <p className={styles.subtitle}>
          Digite sua nova senha abaixo para acessar sua conta.
        </p>
      </div>

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        {error && <div className={styles.alertError} role="alert">{error}</div>}

        <div className={styles.fieldGroup}>
          <PasswordInputBox
            id="recovery-new-password"
            label="Nova senha"
            placeholder="Digite sua nova senha"
            value={newPassword}
            disabled={pending}
            onChange={setNewPassword}
          />
          <PasswordRulesChecklist rules={rules} />
        </div>

        <div className={styles.fieldGroup}>
          <PasswordInputBox
            id="recovery-confirm-password"
            label="Confirmar nova senha"
            placeholder="Digite novamente sua nova senha"
            value={confirmPassword}
            disabled={pending}
            onChange={setConfirmPassword}
          />
        </div>

        <button type="submit" className={styles.submitButton} disabled={pending}>
          <span />
          <span>{pending ? 'Salvando…' : 'Salvar nova senha'}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

function PasswordInputBox({
  id,
  label,
  placeholder,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.inputControl}>
        <span className={styles.inputIcon} aria-hidden="true"><LockKeyhole size={18} /></span>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          maxLength={128}
          placeholder={placeholder}
          className={styles.input}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
    </>
  );
}

function PasswordRulesChecklist({
  rules,
}: {
  rules: { minLength: boolean; hasUppercase: boolean; hasLowercase: boolean; hasNumber: boolean };
}) {
  const items = [
    { label: 'Pelo menos 8 caracteres', met: rules.minLength },
    { label: 'Uma letra maiúscula', met: rules.hasUppercase },
    { label: 'Uma letra minúscula', met: rules.hasLowercase },
    { label: 'Um número', met: rules.hasNumber },
  ];
  return (
    <ul className={styles.checklist} aria-label="Requisitos da nova senha">
      {items.map((item) => (
        <li
          key={item.label}
          className={`${styles.checklistItem} ${item.met ? styles.checklistItemMet : ''}`}
        >
          <span className={styles.checkBullet} aria-hidden="true">
            {item.met && <Check size={10} strokeWidth={3} />}
          </span>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
