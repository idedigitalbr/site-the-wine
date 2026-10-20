'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCustomerSession } from '@/lib/customer-auth-client';
import type { CustomerAuthDestination } from '@/lib/customer-auth-destination';
import { AuthPageShell } from './AuthPageShell';
import { CustomerLoginForm } from './CustomerLoginForm';
import { CustomerSignupForm } from './CustomerSignupForm';
import styles from './CustomerAccess.module.css';

type Mode = 'login' | 'signup';
type Props = { initialMode: Mode; destination: CustomerAuthDestination; reason?: 'expired' | 'changed' };
type AuthUser = { id: string; name: string };

export function CustomerAccessScreen({ initialMode, destination, reason }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [phase, setPhase] = useState<'checking' | 'ready' | 'confirming' | 'error'>('checking');
  const [message, setMessage] = useState(reason === 'expired' ? 'Sua sessão expirou. Entre novamente para continuar.' : reason === 'changed' ? 'Sua conta mudou. Entre novamente para continuar.' : '');
  const [generation, setGeneration] = useState(0);

  const routeAuthenticated = useCallback(() => { router.replace(destination); }, [destination, router]);
  const checkExistingSession = useCallback(async () => {
    setPhase('checking');
    try {
      const session = await getCustomerSession();
      if (session.status === 'authenticated' && session.user) { routeAuthenticated(); return; }
      setPhase('ready');
    } catch { setMessage('Não foi possível verificar seu acesso agora. Tente novamente.'); setPhase('error'); }
  }, [routeAuthenticated]);

  useEffect(() => { queueMicrotask(() => void checkExistingSession()); }, [checkExistingSession]);

  async function handleSuccess(user: AuthUser) {
    setPhase('confirming');
    setMessage('');
    try {
      const session = await getCustomerSession();
      if (session.status === 'authenticated' && session.user?.id === user.id) { routeAuthenticated(); return; }
      if (session.status === 'authenticated' && session.user?.id !== user.id) { setMessage('A conta confirmada é diferente. Recarregue a página e tente novamente.'); setPhase('error'); return; }
      returnToLogin();
    } catch { setMessage('O acesso pode ter sido concluído. Verifique novamente para continuar.'); setPhase('error'); }
  }

  function returnToLogin() { setMode('login'); setMessage('Não foi possível manter seu acesso. Entre novamente.'); setPhase('ready'); setGeneration((value) => value + 1); }

  return (
    <AuthPageShell mode={mode}>
      {phase === 'checking' && <div className={styles.statusPanel}><p>Verificando seu acesso…</p></div>}
      {phase === 'confirming' && <div className={styles.statusPanel}><p>Confirmando seu acesso…</p></div>}
      {phase === 'error' && <div className={styles.statusPanel}><p role="alert">{message}</p><div className={styles.statusActions}><button type="button" className={styles.submitButton} onClick={() => void checkExistingSession()}>Verificar novamente</button><button type="button" className={styles.textLink} onClick={returnToLogin}>Voltar ao login</button></div></div>}
      {phase === 'ready' && (mode === 'login' ? <CustomerLoginForm key={`login-${generation}`} onSuccess={handleSuccess} onModeChange={() => { setMode('signup'); setMessage(''); setGeneration((value) => value + 1); }} /> : <CustomerSignupForm key={`signup-${generation}`} onSuccess={handleSuccess} onModeChange={() => { setMode('login'); setMessage(''); setGeneration((value) => value + 1); }} />)}
    </AuthPageShell>
  );
}
