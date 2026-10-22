'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/SocialIcons';
import { formatWhatsAppPhoneInput } from '@/modules/account-settings/domain/account-settings-schema';
import styles from '../AccountSettings.module.css';

interface AddWhatsAppModalProps {
  isOpen: boolean;
  currentNumber?: string;
  onClose: () => void;
  onSave: (number: string) => Promise<{ success: boolean; message?: string }>;
}

export function AddWhatsAppModal({ isOpen, currentNumber = '', onClose, onSave }: AddWhatsAppModalProps) {
  const [number, setNumber] = useState(formatWhatsAppPhoneInput(currentNumber));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // A modal reopening must reflect the latest persisted number.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNumber(formatWhatsAppPhoneInput(currentNumber));
  }, [currentNumber, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await onSave(number);
      if (res.success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="whatsapp-modal-title">
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-3">
            <WhatsAppIcon className="w-5 h-5 text-[#D3B97B]" />
            <h2 id="whatsapp-modal-title" className={styles.modalTitle}>
              Configurar WhatsApp
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.modalCloseBtn}
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.fieldGroup} style={{ marginBottom: 20 }}>
            <label htmlFor="whatsapp-number-input" className={styles.label}>
              Número com DDD
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="whatsapp-number-input"
                type="tel"
                value={number}
                onChange={(e) => setNumber(formatWhatsAppPhoneInput(e.target.value))}
                placeholder="(91) 98765-4321"
                className={styles.inputControl}
                inputMode="tel"
                autoComplete="tel-national"
                maxLength={15}
                autoFocus
                required
              />
            </div>
            <span className={styles.helperText}>
              Enviaremos confirmações de reserva e avisos essenciais para este número.
            </span>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={styles.goldOutlineButton}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={styles.primaryGoldButton}
              aria-busy={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : null}
              <span>{isSaving ? 'Salvando…' : 'Salvar número'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
