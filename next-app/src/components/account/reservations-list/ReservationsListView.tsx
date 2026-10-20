'use client';

import Link from 'next/link';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { AddReservationCard } from './AddReservationCard';
import { ReservationCard } from './ReservationCard';
import { useCustomerReservations } from './useCustomerReservations';
import styles from './ReservationsList.module.css';

type ReservationsListState = ReturnType<typeof useCustomerReservations>;

function ReadyReservations({ state }: { state: ReservationsListState }) {
  return (
    <>
      {state.reservations.length === 0 && <p className={styles.emptyMessage}>Você ainda não tem reservas.</p>}
      <div className={styles.cardsGrid}>
        {state.reservations.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} />)}
        <AddReservationCard />
      </div>
      {state.nextOffset !== null && (
        <div className={styles.pagination}>
          {state.moreError && <p className={styles.feedbackText} role="alert">Não foi possível carregar mais reservas.</p>}
          <button className={styles.actionButton} type="button" disabled={state.isLoadingMore} onClick={() => void state.loadMore()}>
            {state.isLoadingMore ? 'Carregando…' : state.moreError ? 'Tentar carregar mais' : 'Carregar mais'}
          </button>
        </div>
      )}
    </>
  );
}

function ReservationsListStateContent({ state }: { state: ReservationsListState }) {
  if (state.phase === 'loading') {
    return (
      <div className={styles.feedbackBox} role="status">
        <LoaderCircle className={styles.spinner} aria-hidden="true" size={24} />
        Carregando suas reservas…
      </div>
    );
  }
  if (state.phase === 'redirecting') return <div className={styles.feedbackBox} role="status">Redirecionando para o acesso…</div>;
  if (state.phase === 'error') {
    return (
      <div className={styles.feedbackBox} role="alert">
        <p className={styles.feedbackText}>Não foi possível carregar suas reservas agora. Tente novamente.</p>
        <button className={styles.actionButton} type="button" onClick={() => void state.retry()}>Tentar novamente</button>
      </div>
    );
  }
  return <ReadyReservations state={state} />;
}

export function ReservationsListView() {
  const state = useCustomerReservations();
  return (
    <main className={styles.mainContainer}>
      <h1 className={styles.srOnly}>Lista de reservas</h1>
      <div className={styles.topBar}>
        <Link className={styles.backButton} href="/">
          <ArrowLeft aria-hidden="true" size={14} strokeWidth={1.7} />
          Voltar
        </Link>
      </div>

      <ReservationsListStateContent state={state} />
    </main>
  );
}
