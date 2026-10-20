'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './CustomerAccess.module.css';

export function CustomerTermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => handleModalKeyDown(event, onClose);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className={styles.modalOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section id="customer-terms-dialog" className={styles.termsModal} role="dialog" aria-modal="true" aria-labelledby="customer-terms-title">
        <button ref={closeButtonRef} className={styles.modalClose} type="button" onClick={onClose} aria-label="Fechar termos"><X size={20} /></button>
        <p className={styles.eyebrow}>INFORMAÇÃO</p>
        <h2 id="customer-terms-title" className={styles.modalTitle}>Termos e Condições</h2>
        <div className={styles.modalBody}>
          <p>Este texto é provisório e será substituído pelo conteúdo jurídico aprovado antes da publicação definitiva.</p>
          <p>Ao criar sua conta, você concorda com o uso dos dados necessários para autenticação, atendimento e gestão das suas reservas, conforme a política aplicável do The Wine Experience.</p>
          <p>A abertura deste resumo não registra aceite. Para continuar, marque o checkbox de aceite na tela de cadastro.</p>
        </div>
        <button className={styles.modalAction} type="button" onClick={onClose}>Fechar</button>
      </section>
    </div>,
    document.body,
  );
}

function handleModalKeyDown(event: KeyboardEvent, onClose: () => void) {
  if (event.key === 'Escape') { onClose(); return; }
  if (event.key !== 'Tab') return;
  cycleModalFocus(event, findFocusableElements());
}

function findFocusableElements(): NodeListOf<HTMLElement> | null | undefined {
  return document.getElementById('customer-terms-dialog')?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
}

function cycleModalFocus(event: KeyboardEvent, focusable: NodeListOf<HTMLElement> | null | undefined) {
  if (!focusable?.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey) return cycleBackward(event, first, last);
  if (document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function cycleBackward(event: KeyboardEvent, first: HTMLElement, last: HTMLElement) {
  if (document.activeElement === first) { event.preventDefault(); last.focus(); }
}
