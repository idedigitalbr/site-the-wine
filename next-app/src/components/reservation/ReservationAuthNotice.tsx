'use client';

import { CircleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ReservationAuthNotice() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const authState = url.searchParams.get('auth');
    if (authState === 'expired') setMessage('Sua sessão expirou. Acesse novamente para continuar.');
    if (authState === 'changed') setMessage('Sua conta mudou. Acesse novamente para continuar.');
  }, []);

  const dismiss = () => {
    setMessage('');
    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  };

  if (!message) return null;
  return (
    <div role="alert" aria-live="polite" className="fixed left-1/2 top-4 z-[120] flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-start gap-3 rounded-[var(--radius-md)] border border-primary/40 bg-surface px-4 py-3 text-sm text-foreground shadow-[0_16px_50px_rgba(0,0,0,.5)]">
      <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18} />
      <span className="flex-1 leading-relaxed">{message}</span>
      <button type="button" onClick={dismiss} className="rounded-full p-1 text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Fechar aviso"><X aria-hidden="true" size={16} /></button>
    </div>
  );
}
