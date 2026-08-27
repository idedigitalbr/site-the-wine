'use client';

import { BarChart3, CalendarRange, ClipboardList, Gauge, LoaderCircle, RefreshCw, Users, WalletCards } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AdminAnalytics } from '@/modules/admin/application/ports';
import { reservationSourceLabel } from '@/lib/admin-labels';

type Props = { initialAnalytics: AdminAnalytics };

function formatDate(date: string): string {
  return date.split('-').reverse().join('/');
}

function number(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

function percentage(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function maxCovers(analytics: AdminAnalytics): number {
  return Math.max(1, ...analytics.daily.map((day) => day.covers));
}

function EmptyAnalytics({ label }: { label: string }) {
  return <p className="py-8 text-center text-sm text-muted">Nenhum dado encontrado para {label}.</p>;
}

export function AdminAnalyticsView({ initialAnalytics }: Props) {
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [from, setFrom] = useState(initialAnalytics.fromDate);
  const [to, setTo] = useState(initialAnalytics.toDate);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!response.ok) throw new Error('analytics_failed');
      setAnalytics(await response.json() as AdminAnalytics);
    } catch {
      setError('Não foi possível atualizar os indicadores. Confira o período informado.');
    } finally {
      setIsLoading(false);
    }
  };

  const cards = [
    { label: 'Reservas', value: number(analytics.metrics.reservations), icon: ClipboardList },
    { label: 'Covers', value: number(analytics.metrics.covers), icon: Users },
    { label: 'Clientes', value: number(analytics.metrics.uniqueCustomers), icon: Users },
    { label: 'Concluídas', value: number(analytics.metrics.completed), icon: BarChart3 },
    { label: 'Não compareceu', value: number(analytics.metrics.noShow), icon: Gauge },
    { label: 'Ocupação atribuída', value: percentage(analytics.metrics.occupancyRate), icon: WalletCards },
  ];
  const dailyMax = maxCovers(analytics);

  return (
    <section className="mt-8 rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="analytics-title">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Fase 8</p><h2 id="analytics-title" className="mt-2 font-display text-3xl text-foreground">Analytics operacional</h2><p className="mt-1 text-sm text-muted">Leitura do período de {formatDate(analytics.fromDate)} a {formatDate(analytics.toDate)}.</p></div>
        <form onSubmit={refresh} className="flex flex-col gap-2 sm:flex-row sm:items-end"><label className="text-xs font-semibold text-foreground">De<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="admin-input mt-1" /></label><label className="text-xs font-semibold text-foreground">Até<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="admin-input mt-1" /></label><button type="submit" disabled={isLoading} className="admin-primary-button"><CalendarRange aria-hidden="true" size={16} />{isLoading ? 'Atualizando' : 'Atualizar'}{isLoading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <RefreshCw aria-hidden="true" size={15} />}</button></form>
      </div>
      {error && <p role="alert" className="mt-4 rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{error}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{cards.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted p-4"><div className="flex items-center justify-between gap-2"><span className="text-xs text-muted">{label}</span><Icon aria-hidden="true" className="text-primary" size={17} /></div><strong className="mt-3 block text-2xl font-semibold text-foreground">{value}</strong></article>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <section className="rounded-[var(--radius-sm)] border border-border p-4" aria-labelledby="analytics-daily-title"><div className="flex items-center justify-between gap-3"><div><h3 id="analytics-daily-title" className="font-display text-2xl text-foreground">Reservas por dia</h3><p className="mt-1 text-xs text-muted">Volume de reservas e pessoas.</p></div><BarChart3 aria-hidden="true" className="text-primary" size={19} /></div>{analytics.daily.length === 0 ? <EmptyAnalytics label="o período" /> : <div className="mt-5 space-y-3">{analytics.daily.map((day) => <div key={day.date} className="grid grid-cols-[74px_minmax(0,1fr)_46px] items-center gap-3 text-xs"><span className="text-muted">{formatDate(day.date)}</span><div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(6, (day.covers / dailyMax) * 100)}%` }} /></div><span className="text-right font-semibold text-foreground">{number(day.covers)}</span></div>)}</div>}</section>
      <section className="rounded-[var(--radius-sm)] border border-border p-4" aria-labelledby="analytics-source-title"><div className="flex items-center justify-between gap-3"><div><h3 id="analytics-source-title" className="font-display text-2xl text-foreground">Origem</h3><p className="mt-1 text-xs text-muted">Como os clientes chegaram.</p></div><Users aria-hidden="true" className="text-primary" size={19} /></div>{analytics.sources.length === 0 ? <EmptyAnalytics label="o período" /> : <div className="mt-5 space-y-3">{analytics.sources.map((source) => <div key={source.source} className="flex items-center justify-between gap-3 border-b border-border pb-2 text-sm last:border-0"><span className="text-foreground">{reservationSourceLabel(source.source)}</span><span className="text-muted">{number(source.reservations)} · {number(source.covers)} covers</span></div>)}</div>}</section>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[var(--radius-sm)] border border-border p-4" aria-labelledby="analytics-peak-title"><div className="flex items-center justify-between gap-3"><div><h3 id="analytics-peak-title" className="font-display text-2xl text-foreground">Horários de pico</h3><p className="mt-1 text-xs text-muted">Faixas com maior procura.</p></div><CalendarRange aria-hidden="true" className="text-primary" size={19} /></div>{analytics.peakHours.length === 0 ? <EmptyAnalytics label="o período" /> : <div className="mt-5 grid gap-2 sm:grid-cols-2">{analytics.peakHours.map((hour) => <div key={hour.hour} className="flex items-center justify-between rounded bg-surface-muted px-3 py-2 text-sm"><span className="font-semibold text-foreground">{hour.hour}</span><span className="text-muted">{number(hour.reservations)} reservas · {number(hour.covers)} covers</span></div>)}</div>}</section>
        <section className="rounded-[var(--radius-sm)] border border-primary/30 bg-primary/5 p-4" aria-labelledby="analytics-revenue-title"><div className="flex items-center justify-between gap-3"><div><h3 id="analytics-revenue-title" className="font-display text-2xl text-foreground">Receita</h3><p className="mt-1 text-xs text-muted">Indicador aguardando definição do gateway.</p></div><WalletCards aria-hidden="true" className="text-primary" size={19} /></div><strong className="mt-5 block text-3xl font-semibold text-foreground">—</strong><p className="mt-2 text-sm text-muted">Pagamento em modo {analytics.revenueMode.toUpperCase()}; nenhum valor real é contabilizado.</p></section>
      </div>
    </section>
  );
}
