import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Users, Utensils } from 'lucide-react';
import Link from 'next/link';
import type { AdminAnalytics, AdminDashboard, AdminReservation } from '@/modules/admin/application/ports';
import { AdminAnalyticsView } from './AdminAnalyticsView';
import { ReservationStatusBadge } from './AdminReservationStatus';

const metricCards = [
  { key: 'total', label: 'Reservas do dia', icon: CalendarDays },
  { key: 'pending', label: 'Aguardando ação', icon: Clock3 },
  { key: 'confirmed', label: 'Confirmadas', icon: CheckCircle2 },
  { key: 'seated', label: 'Em atendimento', icon: Users },
] as const;

function formatDate(date: string): string {
  return date.split('-').reverse().join('/');
}

function DashboardReservationRow({ reservation }: { reservation: AdminReservation }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-4"><span className="font-semibold text-foreground">{reservation.startTime}</span><span className="block text-xs text-muted">{reservation.endTime}</span></td>
      <td className="px-4 py-4"><span className="font-medium text-foreground">{reservation.customerName}</span><span className="block text-xs text-muted">{reservation.customerPhone}</span></td>
      <td className="px-4 py-4 text-sm text-muted">{reservation.guestCount} {reservation.guestCount === 1 ? 'pessoa' : 'pessoas'}</td>
      <td className="px-4 py-4"><ReservationStatusBadge status={reservation.status} /></td>
    </tr>
  );
}

export function AdminDashboardView({ dashboard, analytics }: { dashboard: AdminDashboard; analytics: AdminAnalytics }) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Visão operacional</p>
          <h1 className="mt-2 font-display text-4xl text-foreground">Bom trabalho, equipe.</h1>
          <p className="mt-2 text-sm text-muted">Acompanhe o movimento de {formatDate(dashboard.date)}.</p>
        </div>
        <Link href="/admin/reservas" className="admin-secondary-button">Ver todas as reservas <ArrowRight aria-hidden="true" size={16} /></Link>
      </header>

      <section aria-label="Indicadores do dia" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ key, label, icon: Icon }) => (
          <article key={key} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><span className="text-sm text-muted">{label}</span><Icon aria-hidden="true" className="text-primary" size={19} strokeWidth={1.7} /></div>
            <strong className="mt-5 block text-3xl font-semibold text-foreground">{dashboard.metrics[key]}</strong>
          </article>
        ))}
      </section>

      <section className="mt-8 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6"><div><h2 className="font-display text-2xl text-foreground">Próximas reservas</h2><p className="mt-1 text-xs text-muted">Agenda operacional do dia</p></div><Utensils aria-hidden="true" className="text-primary" size={21} /></div>
        {dashboard.reservations.length === 0 ? <p className="px-6 py-12 text-center text-sm text-muted">Nenhuma reserva registrada para este dia.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-semibold sm:px-6">Horário</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Grupo</th><th className="px-4 py-3 font-semibold">Status</th></tr></thead><tbody>{dashboard.reservations.map((reservation) => <DashboardReservationRow key={reservation.id} reservation={reservation} />)}</tbody></table></div>
        )}
      </section>
      <AdminAnalyticsView initialAnalytics={analytics} />
    </div>
  );
}
