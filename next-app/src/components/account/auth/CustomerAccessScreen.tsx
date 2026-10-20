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
type Props = { initialMode: Mode; destination: CustomerAuthDestination; reason?: 'expired' | 'changed' | 'password-reset' };
type AuthUser = { id: string; name: string };

function resolveInitialAuthMessage(reason?: string): string {
  if (reason === 'expired') return 'Sua sessão expirou. Entre novamente para continuar.';
  if (reason === 'changed') return 'Sua conta mudou. Entre novamente para continuar.';
  return '';
}

export function CustomerAccessScreen({ initialMode, destination, reason }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [phase, setPhase] = useState<'checking' | 'ready' | 'confirming' | 'error'>('checking');
  const [message, setMessage] = useState(() => resolveInitialAuthMessage(reason));
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

  const loginNotice = reason === 'password-reset' ? 'Senha redefinida com sucesso. Digite seu CPF e sua nova senha para entrar.' : undefined;

  return (
    <AuthPageShell mode={mode}>
      <PhaseDisplay
        phase={phase}
        message={message}
        onRetry={() => void checkExistingSession()}
        onReturnToLogin={returnToLogin}
      />
      {phase === 'ready' && (
        <AuthFormByMode
          mode={mode}
          generation={generation}
          loginNotice={loginNotice}
          onSuccess={handleSuccess}
          onSwitchToSignup={() => { setMode('signup'); setMessage(''); setGeneration((v) => v + 1); }}
          onSwitchToLogin={() => { setMode('login'); setMessage(''); setGeneration((v) => v + 1); }}
        />
      )}
    </AuthPageShell>
  );
}

function PhaseDisplay({
  phase,
  message,
  onRetry,
  onReturnToLogin,
}: {
  phase: 'checking' | 'ready' | 'confirming' | 'error';
  message: string;
  onRetry: () => void;
  onReturnToLogin: () => void;
}) {
  if (phase === 'checking') return <div className={styles.statusPanel}><p>Verificando seu acesso…</p></div>;
  if (phase === 'confirming') return <div className={styles.statusPanel}><p>Confirmando seu acesso…</p></div>;
  if (phase === 'error') {
    return (
      <div className={styles.statusPanel}>
        <p role="alert">{message}</p>
        <div className={styles.statusActions}>
          <button type="button" className={styles.submitButton} onClick={onRetry}>Verificar novamente</button>
          <button type="button" className={styles.textLink} onClick={onReturnToLogin}>Voltar ao login</button>
        </div>
      </div>
    );
  }
  return null;
}

function AuthFormByMode({
  mode,
  generation,
  loginNotice,
  onSuccess,
  onSwitchToSignup,
  onSwitchToLogin,
}: {
  mode: Mode;
  generation: number;
  loginNotice: string | undefined;
  onSuccess: (user: AuthUser) => Promise<void>;
  onSwitchToSignup: () => void;
  onSwitchToLogin: () => void;
}) {
  if (mode === 'login') {
    return (
      <CustomerLoginForm
        key={`login-${generation}`}
        notice={loginNotice}
        onSuccess={onSuccess}
        onModeChange={onSwitchToSignup}
      />
    );
  }
  return (
    <CustomerSignupForm
      key={`signup-${generation}`}
      onSuccess={onSuccess}
      onModeChange={onSwitchToLogin}
    />
  );
}
