'use client';

import { Eye, EyeOff } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId, useState } from 'react';
import styles from './CustomerAccess.module.css';

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  error?: string;
  description?: string;
  togglePassword?: boolean;
};

export function AuthField({ label, icon, error, description, togglePassword, id, ...props }: AuthFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const { describedBy, descriptionId, errorId } = fieldReferences(inputId, Boolean(description), Boolean(error));

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={inputId}>{label}</label>
      <div className={`${styles.control} ${error ? styles.controlError : ''}`}>
        {icon && <span className={styles.fieldIcon} aria-hidden="true">{icon}</span>}
        <input
          {...props}
          id={inputId}
          type={passwordType(togglePassword, visible, props.type)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={styles.input}
        />
        {togglePassword && <PasswordToggle visible={visible} onToggle={() => setVisible((current) => !current)} />}
      </div>
      {description && <p id={descriptionId} className={styles.fieldDescription}>{description}</p>}
      {error && <p id={errorId} className={styles.fieldError} role="alert">{error}</p>}
    </div>
  );
}

function fieldReferences(inputId: string, hasDescription: boolean, hasError: boolean) {
  const descriptionId = hasDescription ? `${inputId}-description` : undefined;
  const errorId = hasError ? `${inputId}-error` : undefined;
  return { descriptionId, errorId, describedBy: [descriptionId, errorId].filter(Boolean).join(' ') || undefined };
}

function passwordType(togglePassword: boolean | undefined, visible: boolean, type: string | undefined): string | undefined {
  return togglePassword ? (visible ? 'text' : 'password') : type;
}

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return <button type="button" className={styles.passwordToggle} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={onToggle}>{visible ? <EyeOff aria-hidden="true" size={19} /> : <Eye aria-hidden="true" size={19} />}</button>;
}
