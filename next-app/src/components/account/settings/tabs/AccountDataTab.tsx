'use client';

import React, { useId, useState } from 'react';
import { User, Lock, Mail, Save, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
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

function calculatePasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: passwordStrengthLabels[0] };

  const score = Math.min(
    1 +
      Number(password.length >= 6) +
      Number(password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password)) +
      Number(/[0-9]/.test(password)) +
      Number(/[^A-Za-z0-9]/.test(password)),
    5,
  );

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
                onChange={(event) => setName(event.target.value)}
                className={styles.inputControl}
                placeholder="Seu nome completo"
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
                onChange={(event) => setEmail(event.target.value)}
                className={styles.inputControl}
                placeholder="joao@email.com"
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
}: {
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; message?: string }>;
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
  const { score: strengthScore, label: strengthLabel } = calculatePasswordStrength(newPassword);

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
            onChange={setCurrentPassword}
            onToggle={() => setShowCurrent((value) => !value)}
            showLabel="Mostrar senha atual"
            hideLabel="Ocultar senha atual"
          />

          <PasswordField
            id={newPassId}
            label="Nova senha"
            value={newPassword}
            placeholder="Digite sua nova senha"
            visible={showNew}
            onChange={setNewPassword}
            onToggle={() => setShowNew((value) => !value)}
            showLabel="Mostrar nova senha"
            hideLabel="Ocultar nova senha"
            footer={<PasswordStrengthMeter score={strengthScore} label={strengthLabel} />}
          />

          <PasswordField
            id={confirmPassId}
            label="Confirmar nova senha"
            value={confirmPassword}
            placeholder="Confirme sua nova senha"
            visible={showConfirm}
            onChange={setConfirmPassword}
            onToggle={() => setShowConfirm((value) => !value)}
            showLabel="Mostrar confirmação de senha"
            hideLabel="Ocultar confirmação de senha"
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
        <PasswordSection changePassword={changePassword} />
      </div>
    </div>
  );
}
