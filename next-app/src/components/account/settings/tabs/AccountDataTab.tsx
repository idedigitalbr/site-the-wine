'use client';

import React, { useId, useState } from 'react';
import { User, Lock, Mail, Save, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import { assessPassword } from '@/modules/customer-auth/domain/password-strength';
import {
  sanitizeEmailInput,
  sanitizeNameForSubmit,
  sanitizePasswordInput,
  sanitizeTextInput,
} from '@/modules/account-settings/domain/account-settings-schema';
import { useAccountSettings } from '../AccountSettingsContext';
import styles from '../AccountSettings.module.css';
import type { UserProfile } from '@/types/account-settings';

const passwordStrengthLabels = [
  'Força da senha',
  'Força da senha: muito fraca',
  'Força da senha: fraca',
  'Força da senha: média',
  'Força da senha: forte',
  'Força da senha: muito forte',
];

function calculatePasswordStrength(password: string, userInputs: string[]): { score: number; label: string } {
  if (!password) return { score: 0, label: 'Use pelo menos 15 caracteres e evite senhas previsíveis.' };
  if (Array.from(password).length < 15) {
    return { score: 2, label: 'Força da senha: curta (mínimo de 15 caracteres)' };
  }
  const assessment = assessPassword(password, userInputs);
  const score = Math.min(5, assessment.score + 1);
  return { score, label: passwordStrengthLabels[score] ?? passwordStrengthLabels[0] };
}

function PersonalInfoSection({
  profile,
  isProfileSaving,
  updateProfile,
}: {
  profile: UserProfile;
  isProfileSaving: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; message?: string }>;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const nameId = useId();
  const cpfId = useId();
  const emailId = useId();

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    await updateProfile({ name, email });
  };

  return (
    <section aria-labelledby="personal-info-heading">
      <div className={styles.sectionHeader}>
        <User className={styles.sectionHeaderIcon} aria-hidden="true" />
        <div className={styles.sectionHeaderText}>
          <h2 id="personal-info-heading" className={styles.sectionTitle}>
            Informações pessoais
          </h2>
          <p className={styles.sectionDescription}>
            Atualize suas informações de contato. O CPF não pode ser alterado.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile}>
        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label htmlFor={nameId} className={styles.label}>
              Nome completo
            </label>
            <div className={styles.inputWrapper}>
              <User className={styles.inputIcon} aria-hidden="true" />
              <input
                id={nameId}
                type="text"
                value={name}
                onChange={(event) => setName(sanitizeTextInput(event.target.value, 160))}
                onBlur={() => setName((current) => sanitizeNameForSubmit(current))}
                className={styles.inputControl}
                placeholder="Seu nome completo"
                maxLength={160}
                required
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor={cpfId} className={styles.label}>
              CPF
            </label>
            <div className={styles.cpfFieldRow}>
              <div className={`${styles.inputWrapper} ${styles.inputWrapperDisabled}`}>
                <Lock className={styles.inputIcon} aria-hidden="true" />
                <input
                  id={cpfId}
                  type="text"
                  value={profile.cpf}
                  disabled
                  readOnly
                  className={`${styles.inputControl} ${styles.inputControlDisabled}`}
                />
              </div>
              <span
                className={styles.cpfInfoIconOutside}
                title="O CPF não pode ser alterado por motivos de segurança e integridade das reservas."
                aria-label="Informações sobre CPF"
              >
                <Info size={18} aria-hidden="true" />
              </span>
            </div>
            <span className={styles.helperText}>O CPF não pode ser alterado.</span>
          </div>
        </div>

        <div className={styles.emailAndSaveRow}>
          <div className={styles.fieldGroup}>
            <label htmlFor={emailId} className={styles.label}>
              E-mail
            </label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} aria-hidden="true" />
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(event) => setEmail(sanitizeEmailInput(event.target.value))}
                className={styles.inputControl}
                placeholder="joao@email.com"
                maxLength={254}
                required
              />
            </div>
          </div>

          <div className={styles.saveActionInline}>
            <button
              type="submit"
              disabled={isProfileSaving}
              className={styles.primaryGoldButton}
              aria-busy={isProfileSaving}
            >
              {isProfileSaving ? (
                <Loader2 className="animate-spin" size={16} aria-hidden="true" />
              ) : (
                <Save size={16} aria-hidden="true" />
              )}
              <span>{isProfileSaving ? 'Salvando…' : 'Salvar alterações'}</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function PasswordField({
  id,
  label,
  value,
  placeholder,
  visible,
  onChange,
  onToggle,
  showLabel,
  hideLabel,
  footer,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
  footer?: React.ReactNode;
  maxLength?: number;
}) {
  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.inputWrapper}>
        <Lock className={styles.inputIcon} aria-hidden="true" />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={styles.inputControl}
        />
        <button
          type="button"
          onClick={onToggle}
          className={styles.inputSuffixIcon}
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <Eye size={17} /> : <EyeOff size={17} />}
        </button>
      </div>
      {footer}
    </div>
  );
}

function PasswordStrengthMeter({ score, label }: { score: number; label: string }) {
  const strengthClass = (bar: number) => {
    if (bar > score) return '';
    if (score <= 2) return styles.strengthBarWeak;
    if (score === 3) return styles.strengthBarMedium;
    if (score === 4) return styles.strengthBarStrong;
    return styles.strengthBarVeryStrong;
  };

  return (
    <div className={styles.strengthMeterContainer} aria-live="polite">
      <div className={styles.strengthMeterBars}>
        {[1, 2, 3, 4, 5].map((bar) => (
          <div key={bar} className={`${styles.strengthBar} ${strengthClass(bar)}`} aria-hidden="true" />
        ))}
      </div>
      <span className={styles.strengthLabel}>{label}</span>
    </div>
  );
}

function PasswordSection({
  changePassword,
  profile,
}: {
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; message?: string }>;
  profile: UserProfile;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const currentPassId = useId();
  const newPassId = useId();
  const confirmPassId = useId();
  const { score: strengthScore, label: strengthLabel } = calculatePasswordStrength(newPassword, [profile.name, profile.email]);

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsChangingPassword(true);
    try {
      const result = await changePassword({ currentPassword, newPassword, confirmPassword });
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <section aria-labelledby="change-password-heading">
      <div className={styles.sectionHeader}>
        <Lock className={styles.sectionHeaderIcon} aria-hidden="true" />
        <div className={styles.sectionHeaderText}>
          <h2 id="change-password-heading" className={styles.sectionTitle}>
            Alterar senha
          </h2>
          <p className={styles.sectionDescription}>Escolha uma nova senha para sua conta.</p>
        </div>
      </div>

      <form onSubmit={handleChangePassword}>
        <div className={styles.formGridThree}>
          <PasswordField
            id={currentPassId}
            label="Senha atual"
            value={currentPassword}
            placeholder="Digite sua senha atual"
            visible={showCurrent}
            onChange={(value) => setCurrentPassword(sanitizePasswordInput(value))}
            onToggle={() => setShowCurrent((value) => !value)}
            showLabel="Mostrar senha atual"
            hideLabel="Ocultar senha atual"
            maxLength={128}
          />

          <PasswordField
            id={newPassId}
            label="Nova senha"
            value={newPassword}
            placeholder="Digite sua nova senha"
            visible={showNew}
            onChange={(value) => setNewPassword(sanitizePasswordInput(value))}
            onToggle={() => setShowNew((value) => !value)}
            showLabel="Mostrar nova senha"
            hideLabel="Ocultar nova senha"
            maxLength={128}
            footer={<PasswordStrengthMeter score={strengthScore} label={strengthLabel} />}
          />

          <PasswordField
            id={confirmPassId}
            label="Confirmar nova senha"
            value={confirmPassword}
            placeholder="Confirme sua nova senha"
            visible={showConfirm}
            onChange={(value) => setConfirmPassword(sanitizePasswordInput(value))}
            onToggle={() => setShowConfirm((value) => !value)}
            showLabel="Mostrar confirmação de senha"
            hideLabel="Ocultar confirmação de senha"
            maxLength={128}
          />
        </div>

        <div className={styles.formActionsRight}>
          <button
            type="submit"
            disabled={isChangingPassword}
            className={styles.primaryGoldButton}
            aria-busy={isChangingPassword}
          >
            {isChangingPassword ? (
              <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            ) : (
              <Lock size={16} aria-hidden="true" />
            )}
            <span>{isChangingPassword ? 'Alterando…' : 'Alterar senha'}</span>
          </button>
        </div>
      </form>
    </section>
  );
}

export function AccountDataTab() {
  const { profile, isProfileSaving, updateProfile, changePassword } = useAccountSettings();

  return (
    <div className={styles.tabContent}>
      <div className={styles.cardSection}>
        <PersonalInfoSection
          key={`${profile.name}:${profile.email}:${profile.cpf}`}
          profile={profile}
          isProfileSaving={isProfileSaving}
          updateProfile={updateProfile}
        />
        <div className={styles.sectionDivider} aria-hidden="true" />
        <PasswordSection changePassword={changePassword} profile={profile} />
      </div>
    </div>
  );
}
