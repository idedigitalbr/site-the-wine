'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { AddReservationCard } from './AddReservationCard';
import { ReservationCard } from './ReservationCard';
import { ReservationReceipt } from '@/components/reservation/receipt/ReservationReceipt';
import { isReservationExpired } from './reservationCardFormatters';
import { useCustomerReservations } from './useCustomerReservations';
import styles from './ReservationsList.module.css';

type ReservationsListViewProps = {
  mode?: 'active' | 'history';
};

type ReservationsListState = ReturnType<typeof useCustomerReservations>;

function selectReservationsByMode(
  reservations: ReservationsListState['reservations'],
  mode: 'active' | 'history',
) {
  const isHistoricMode = mode === 'history';

  return reservations.filter((reservation) => {
    const expired = isReservationExpired(reservation.reservationDate, reservation.startTime);
    return isHistoricMode ? expired : !expired;
  });
}

function reservationCardVariant(mode: 'active' | 'history') {
  return mode === 'history' ? 'historic' : 'default';
}

function EmptyReservationsMessage({
  visible,
  mode,
}: {
  visible: boolean;
  mode: 'active' | 'history';
}) {
  if (!visible) return null;

  return (
    <p className={styles.emptyMessage}>
      {mode === 'history' ? 'Você não possui reservas no histórico.' : 'Você ainda não tem reservas.'}
    </p>
  );
}

function AddReservationForActiveMode({ mode }: { mode: 'active' | 'history' }) {
  if (mode === 'history') return null;
  return <AddReservationCard />;
}

function ReadyReservations({
  state,
  mode = 'active',
  expandedIds,
  onToggle,
  onPrint,
  onEnsureInitialExpanded,
}: {
  state: ReservationsListState;
  mode?: 'active' | 'history';
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onPrint: (id: number) => void;
  onEnsureInitialExpanded: (id: number) => void;
}) {
  const visibleReservations = useMemo(() => {
    return selectReservationsByMode(state.reservations, mode);
  }, [state.reservations, mode]);

  useEffect(() => {
    if (mode === 'active' && visibleReservations[0]) onEnsureInitialExpanded(visibleReservations[0].id);
  }, [mode, onEnsureInitialExpanded, visibleReservations]);

  return (
    <>
      <EmptyReservationsMessage visible={visibleReservations.length === 0} mode={mode} />
      <div className={styles.cardsGrid}>
        {visibleReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            isExpanded={expandedIds.has(reservation.id)}
            onToggle={() => onToggle(reservation.id)}
            onPrint={() => onPrint(reservation.id)}
            variant={reservationCardVariant(mode)}
          />
        ))}
        <AddReservationForActiveMode mode={mode} />
      </div>
      {state.nextOffset !== null && (
        <div className={styles.pagination}>
          {state.moreError && (
            <p className={styles.feedbackText} role="alert">
              Não foi possível carregar mais reservas.
            </p>
          )}
          <button
            className={styles.actionButton}
            type="button"
            disabled={state.isLoadingMore}
            onClick={() => void state.loadMore()}
          >
            {state.isLoadingMore ? 'Carregando…' : state.moreError ? 'Tentar carregar mais' : 'Carregar mais'}
          </button>
        </div>
      )}
    </>
  );
}

function ReservationsListStateContent({
  state,
  mode = 'active',
  expandedIds,
  onToggle,
  onPrint,
  onEnsureInitialExpanded,
}: {
  state: ReservationsListState;
  mode?: 'active' | 'history';
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onPrint: (id: number) => void;
  onEnsureInitialExpanded: (id: number) => void;
}) {
  if (state.phase === 'loading') {
    return (
      <div className={styles.feedbackBox} role="status">
        <LoaderCircle className={styles.spinner} aria-hidden="true" size={24} />
        Carregando suas reservas…
      </div>
    );
  }
  if (state.phase === 'redirecting') {
    return (
      <div className={styles.feedbackBox} role="status">
        Redirecionando para o acesso…
      </div>
    );
  }
  if (state.phase === 'error') {
    return (
      <div className={styles.feedbackBox} role="alert">
        <p className={styles.feedbackText}>
          Não foi possível carregar suas reservas agora. Tente novamente.
        </p>
        <button
          className={styles.actionButton}
          type="button"
          onClick={() => void state.retry()}
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  return <ReadyReservations state={state} mode={mode} expandedIds={expandedIds} onToggle={onToggle} onPrint={onPrint} onEnsureInitialExpanded={onEnsureInitialExpanded} />;
}

export function ReservationsListView({ mode = 'active' }: ReservationsListViewProps) {
  const state = useCustomerReservations();
  const isHistoric = mode === 'history';
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [printReservationId, setPrintReservationId] = useState<number | null>(null);
  const initialExpansionDone = useRef(false);
  const printReservation = state.reservations.find((reservation) => reservation.id === printReservationId) ?? null;

  const toggleReservation = useCallback((id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const ensureInitialExpanded = useCallback((id: number) => {
    if (initialExpansionDone.current) return;
    initialExpansionDone.current = true;
    setExpandedIds((current) => new Set(current).add(id));
  }, []);

  useEffect(() => {
    if (!printReservation) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.body.dataset.reservationPrinting = 'true';
      window.print();
    });
    const cleanup = () => {
      delete document.body.dataset.reservationPrinting;
      setPrintReservationId(null);
    };
    window.addEventListener('afterprint', cleanup, { once: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', cleanup);
      delete document.body.dataset.reservationPrinting;
    };
  }, [printReservation]);

  return (
    <main className={styles.mainContainer}>
      <h1 className={styles.srOnly}>
        {isHistoric ? 'Histórico de reservas' : 'Lista de reservas'}
      </h1>
      <div className={styles.topBar}>
        <Link
          className={styles.backButton}
          href={isHistoric ? '/lista-de-reservas' : '/'}
        >
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.7} />
          Voltar
        </Link>
        {!isHistoric && (
          <Link
            className={styles.historyButton}
            href="/lista-de-reservas/historico"
          >
            Histórico de reservas
          </Link>
        )}
      </div>

      <ReservationsListStateContent state={state} mode={mode} expandedIds={expandedIds} onToggle={toggleReservation} onPrint={setPrintReservationId} onEnsureInitialExpanded={ensureInitialExpanded} />
      {printReservation && <div className={styles.printLayer}><ReservationReceipt reservation={printReservation} /></div>}
    </main>
  );
}
