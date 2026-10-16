'use client';

import { CalendarDays, LogIn, LogOut, Settings, UserRound } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type MutableRefObject } from 'react';
import styles from './FloatingAccountMenu.module.css';

const ACCOUNT_SETTINGS_PATH = '/configuracoes';
const CUSTOMER_ACCESS_PATH = '/acesso';
const RESERVATIONS_PATH = '/reservas';
const SESSION_ENDPOINT = '/api/customer-auth/session';
const SIGN_OUT_ENDPOINT = '/api/customer-auth/sign-out';

type CustomerSessionState =
  | { status: 'loading' }
  | { status: 'authenticated' }
  | { status: 'anonymous' }
  | { status: 'error' };

type SessionRequest = {
  controller: AbortController;
  id: number;
  promise: Promise<void>;
};

function isAuthenticatedSession(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as { status?: unknown; user?: unknown };
  if (candidate.status !== 'authenticated' || typeof candidate.user !== 'object' || candidate.user === null) {
    return false;
  }

  const user = candidate.user as { id?: unknown; name?: unknown };
  return typeof user.id === 'string' && typeof user.name === 'string';
}

function isAnonymousSession(value: unknown): boolean {
  return typeof value === 'object' && value !== null && (value as { status?: unknown }).status === 'anonymous';
}

async function requestCustomerSession(signal: AbortSignal): Promise<'authenticated' | 'anonymous'> {
  const response = await fetch(SESSION_ENDPOINT, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error('session_request_failed');

  const payload: unknown = await response.json();
  if (isAuthenticatedSession(payload)) return 'authenticated';
  if (isAnonymousSession(payload)) return 'anonymous';
  throw new Error('session_response_invalid');
}

async function requestCustomerSignOut(): Promise<void> {
  const response = await fetch(SIGN_OUT_ENDPOINT, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('sign_out_request_failed');

  const payload: unknown = await response.json();
  if (typeof payload !== 'object' || payload === null || (payload as { status?: unknown }).status !== 'signed_out') {
    throw new Error('sign_out_response_invalid');
  }
}

function hasBlockingOverlay(): boolean {
  return Boolean(document.querySelector(
    '.modal-overlay.active, .menu-modal-overlay.active, .lightbox.active, #mobileNav.open, #mobileOverlay.visible',
  ));
}

function focusPanelOnKeyboardOpen(
  button: HTMLButtonElement | null,
  panel: HTMLElement | null,
  focusPanelOnOpen: MutableRefObject<boolean>,
) {
  if (focusPanelOnOpen.current) {
    focusPanelOnOpen.current = false;
    if (document.activeElement === button) panel?.focus();
  }
}

function focusFirstActionAfterSessionCheck(
  sessionStatus: CustomerSessionState['status'],
  panel: HTMLElement | null,
  keyboardOpen: MutableRefObject<boolean>,
) {
  if (document.activeElement !== panel || sessionStatus === 'loading') return;
  const firstAction = panel?.querySelector<HTMLElement>('a[href], button:not(:disabled)');
  if (!firstAction) return;
  firstAction.focus();
  keyboardOpen.current = false;
}

function focusKeyboardPanel(
  isOpen: boolean,
  sessionStatus: CustomerSessionState['status'],
  button: HTMLButtonElement | null,
  panel: HTMLElement | null,
  keyboardOpen: MutableRefObject<boolean>,
  focusPanelOnOpen: MutableRefObject<boolean>,
) {
  if (!isOpen || !keyboardOpen.current) return;
  focusPanelOnKeyboardOpen(button, panel, focusPanelOnOpen);
  focusFirstActionAfterSessionCheck(sessionStatus, panel, keyboardOpen);
}

function AccountMenuContents({
  session,
  isSigningOut,
  signOutFailed,
  onRetry,
  onSignOut,
  onNavigate,
}: {
  session: CustomerSessionState;
  isSigningOut: boolean;
  signOutFailed: boolean;
  onRetry: () => void;
  onSignOut: () => void;
  onNavigate: () => void;
}) {
  if (isSigningOut) return <p className={styles.status} role="status" aria-live="polite">Saindo…</p>;

  switch (session.status) {
    case 'loading':
      return <p className={styles.status} role="status" aria-live="polite">Verificando acesso…</p>;
    case 'error':
      return (
        <div className={styles.feedback}>
          <p className={styles.status} role="status" aria-live="polite">Não foi possível verificar seu acesso.</p>
          <button type="button" className={styles.action} onClick={onRetry}>Tentar novamente</button>
        </div>
      );
    case 'authenticated':
      return (
        <>
          <a className={styles.action} href={ACCOUNT_SETTINGS_PATH} onClick={onNavigate}>
            <Settings aria-hidden="true" size={18} />
            <span>Conta</span>
          </a>
          <a className={styles.action} href={RESERVATIONS_PATH} onClick={onNavigate}>
            <CalendarDays aria-hidden="true" size={18} />
            <span>Reservas</span>
          </a>
          <div className={styles.separator} aria-hidden="true" />
          {signOutFailed && (
            <p className={styles.error} role="alert">Não foi possível sair. Tente novamente.</p>
          )}
          <button type="button" className={styles.action} onClick={onSignOut}>
            <LogOut aria-hidden="true" size={18} />
            <span>Sair</span>
          </button>
        </>
      );
    case 'anonymous':
      return (
        <a className={styles.action} href={CUSTOMER_ACCESS_PATH} onClick={onNavigate}>
          <LogIn aria-hidden="true" size={18} />
          <span>Login/cadastro</span>
        </a>
      );
  }
}

export function FloatingAccountMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<CustomerSessionState>({ status: 'loading' });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const isOpenRef = useRef(false);
  const isSigningOutRef = useRef(false);
  const keyboardOpenRef = useRef(false);
  const keyboardActivationRef = useRef(false);
  const focusPanelOnOpenRef = useRef(false);
  const requestSequenceRef = useRef(0);
  const sessionRequestRef = useRef<SessionRequest | null>(null);
  const mountedRef = useRef(false);

  const setSessionState = useCallback((next: CustomerSessionState) => {
    setSession(next);
  }, []);

  const setOpenState = useCallback((next: boolean) => {
    isOpenRef.current = next;
    setIsOpen(next);
    if (!next) {
      keyboardOpenRef.current = false;
      focusPanelOnOpenRef.current = false;
    }
  }, []);

  const checkCustomerSession = useCallback((): Promise<void> => {
    if (isSigningOutRef.current) return Promise.resolve();

    const existingRequest = sessionRequestRef.current;
    if (existingRequest) return existingRequest.promise;

    const id = ++requestSequenceRef.current;
    const controller = new AbortController();
    setSessionState({ status: 'loading' });

    const promise = (async () => {
      try {
        const status = await requestCustomerSession(controller.signal);
        if (mountedRef.current && requestSequenceRef.current === id) setSessionState({ status });
      } catch {
        if (mountedRef.current && requestSequenceRef.current === id) {
          setSessionState({ status: 'error' });
        }
      } finally {
        if (sessionRequestRef.current?.id === id) sessionRequestRef.current = null;
      }
    })();

    sessionRequestRef.current = { controller, id, promise };
    return promise;
  }, [setSessionState]);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setOpenState(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, [setOpenState]);

  const invalidateSessionRequest = useCallback(() => {
    const pending = sessionRequestRef.current;
    if (!pending) return;

    requestSequenceRef.current += 1;
    sessionRequestRef.current = null;
    pending.controller.abort();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Deferring one task lets React Strict Mode's development-only setup/cleanup
    // replay cancel the first scheduled mount check instead of issuing it twice.
    const initialCheckTimer = window.setTimeout(() => {
      void checkCustomerSession();
    }, 0);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialCheckTimer);
      requestSequenceRef.current += 1;
      const pending = sessionRequestRef.current;
      sessionRequestRef.current = null;
      pending?.controller.abort();
    };
  }, [checkCustomerSession]);

  useLayoutEffect(() => {
    focusKeyboardPanel(
      isOpen,
      session.status,
      buttonRef.current,
      panelRef.current,
      keyboardOpenRef,
      focusPanelOnOpenRef,
    );
  }, [isOpen, session.status]);

  useEffect(() => {
    const syncBlockingState = () => {
      const blocked = hasBlockingOverlay();
      setIsBlocked(blocked);
      if (blocked && isOpenRef.current) {
        if (rootRef.current?.contains(document.activeElement)) {
          (document.activeElement as HTMLElement).blur();
        }
        closeMenu(false);
      }
    };

    syncBlockingState();
    const observer = new MutationObserver(syncBlockingState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    });

    return () => observer.disconnect();
  }, [closeMenu]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (isOpenRef.current && root && event.target instanceof Node && !root.contains(event.target)) {
        closeMenu(false);
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (isOpenRef.current && root && event.target instanceof Node && !root.contains(event.target)) {
        closeMenu(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpenRef.current) {
        event.preventDefault();
        closeMenu(true);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [closeMenu]);

  useEffect(() => {
    if (!isOpen) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkCustomerSession();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [checkCustomerSession, isOpen]);

  const handleAccountButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    const keyboardActivated = event.detail === 0 || keyboardActivationRef.current;
    keyboardActivationRef.current = false;
    if (isBlocked) return;
    if (isOpenRef.current) {
      closeMenu(false);
      return;
    }

    keyboardOpenRef.current = keyboardActivated;
    focusPanelOnOpenRef.current = keyboardActivated;
    setOpenState(true);
    void checkCustomerSession();
  };

  const applySuccessfulSignOut = () => {
    invalidateSessionRequest();
    setSessionState({ status: 'anonymous' });
    setSignOutFailed(false);
    const focusIsInPanel = panelRef.current?.contains(document.activeElement) ?? false;
    setOpenState(false);
    if (focusIsInPanel) buttonRef.current?.focus();
  };

  const handleSignOut = async () => {
    if (isSigningOutRef.current) return;

    invalidateSessionRequest();
    isSigningOutRef.current = true;
    setIsSigningOut(true);
    setSignOutFailed(false);

    try {
      await requestCustomerSignOut();
      if (!mountedRef.current) return;
      applySuccessfulSignOut();
    } catch {
      if (mountedRef.current) setSignOutFailed(true);
    } finally {
      isSigningOutRef.current = false;
      if (mountedRef.current) setIsSigningOut(false);
    }
  };

  const handleRetrySession = () => {
    void checkCustomerSession();
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-account-menu-root
      aria-hidden={isBlocked ? 'true' : undefined}
      inert={isBlocked}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-label="Minha conta"
        aria-expanded={isOpen}
        aria-controls="floating-account-menu-panel"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') keyboardActivationRef.current = true;
        }}
        onClick={handleAccountButtonClick}
      >
        <UserRound aria-hidden="true" size={24} strokeWidth={1.7} />
      </button>

      <nav
        ref={panelRef}
        id="floating-account-menu-panel"
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
        aria-label="Navegação da conta"
        aria-hidden={!isOpen}
        inert={!isOpen}
        tabIndex={-1}
      >
        <AccountMenuContents
          session={session}
          isSigningOut={isSigningOut}
          signOutFailed={signOutFailed}
          onRetry={handleRetrySession}
          onSignOut={handleSignOut}
          onNavigate={() => closeMenu(false)}
        />
      </nav>
    </div>
  );
}
