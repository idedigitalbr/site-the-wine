import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import '../../../../public/style.css';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import { Header } from '@/components/layout/Header';
import { ReservationsListView } from '@/components/account/reservations-list/ReservationsListView';
import styles from '@/components/account/reservations-list/ReservationsList.module.css';
import { getCustomerSession } from '@/server/customer-auth/service';
import { getCustomerReservationsPageAccess } from '@/server/reservations/customer-reservations-page-access';

export const metadata: Metadata = {
  title: 'Histórico de reservas | The Wine Experience',
  description: 'Consulte o histórico de suas reservas no The Wine Experience.',
  alternates: { canonical: '/lista-de-reservas/historico' },
  robots: { index: false, follow: false },
};

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.pageWrapper}>
      <Header />
      {children}
      <SiteBehaviorController />
    </div>
  );
}

export default async function HistoricReservationsRoute() {
  const requestHeaders = new Headers(await headers());
  const request = new Request('http://internal/lista-de-reservas/historico', { headers: requestHeaders });
  const access = await getCustomerReservationsPageAccess(request, getCustomerSession);

  if (access.status === 'anonymous') redirect('/acesso');
  if (access.status === 'unavailable') {
    return (
      <PageShell>
        <main className={styles.mainContainer}>
          <h1 className={styles.srOnly}>Histórico de reservas</h1>
          <div className={styles.feedbackBox} role="alert">
            <p className={styles.feedbackText}>Não foi possível verificar seu acesso agora.</p>
            <Link className={styles.actionButton} href="/lista-de-reservas/historico">Tentar novamente</Link>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ReservationsListView mode="history" />
    </PageShell>
  );
}
