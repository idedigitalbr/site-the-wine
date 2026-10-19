'use client';

import React, { useState } from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';
import type { PaymentMethod } from '@/types/account-settings';
import styles from '../AccountSettings.module.css';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (card: Omit<PaymentMethod, 'id'>) => Promise<{ success: boolean; message?: string }>;
}

export function AddPaymentModal({ isOpen, onClose, onAdd }: AddPaymentModalProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [holderName, setHolderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  // Format Card Number input with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry input MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setExpiry(raw);
    }
  };

  const detectBrand = (num: string): 'visa' | 'mastercard' | 'elo' => {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    return 'visa';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = cardNumber.replace(/\D/g, '');
    if (cleanNum.length < 13) return;

    setIsSaving(true);
    try {
      const brand = detectBrand(cleanNum);
      const last4 = cleanNum.slice(-4);
      const res = await onAdd({
        brand,
        type: 'Cartão de crédito',
        last4,
        expiry: expiry || '12/29',
        isPrimary,
      });
      if (res.success) {
        setCardNumber('');
        setHolderName('');
        setExpiry('');
        setCvv('');
        setIsPrimary(false);
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="add-card-modal-title">
      <div className={styles.modalBox}>
        <div className={styles.modalHeader}>
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-[#D3B97B]" />
            <h2 id="add-card-modal-title" className={styles.modalTitle}>
              Adicionar forma de pagamento
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
          <div className={styles.fieldGroup} style={{ marginBottom: 16 }}>
            <label htmlFor="card-number-input" className={styles.label}>
              Número do cartão
            </label>
            <div className={styles.inputWrapper}>
              <CreditCard className={styles.inputIcon} />
              <input
                id="card-number-input"
                type="text"
                value={cardNumber}
                onChange={handleCardNumberChange}
                placeholder="0000 0000 0000 0000"
                className={styles.inputControl}
                required
                autoFocus
              />
            </div>
          </div>

          <div className={styles.fieldGroup} style={{ marginBottom: 16 }}>
            <label htmlFor="card-name-input" className={styles.label}>
              Nome impresso no cartão
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="card-name-input"
                type="text"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                placeholder="NOME COMO NO CARTÃO"
                className={styles.inputControl}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={styles.fieldGroup}>
              <label htmlFor="card-expiry-input" className={styles.label}>
                Validade
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="card-expiry-input"
                  type="text"
                  value={expiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/AA"
                  className={styles.inputControl}
                  required
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="card-cvv-input" className={styles.label}>
                CVV
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="card-cvv-input"
                  type="password"
                  maxLength={4}
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                  placeholder="123"
                  className={styles.inputControl}
                  required
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none mb-6">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="accent-[#D3B97B] w-4 h-4 rounded"
            />
            <span className="text-sm text-[#DDD8D0]">Definir como forma de pagamento principal</span>
          </label>

          <div className="flex justify-end gap-3">
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
              <span>{isSaving ? 'Adicionando…' : 'Salvar cartão'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
