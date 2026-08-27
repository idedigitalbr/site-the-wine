'use client';

import { LoaderCircle, RefreshCw, Search, UserRound, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { AdminCustomer } from '@/modules/admin/application/ports';

type Props = { initialCustomers: AdminCustomer[] };

function formatDate(date: string | null): string {
  return date ? date.split('-').reverse().join('/') : 'Ainda não visitou';
}

function number(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function AdminCustomersView({ initialCustomers }: Props) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/customers?search=${encodeURIComponent(search)}`);
      if (!response.ok) throw new Error('customers_failed');
      const body = await response.json() as { customers: AdminCustomer[] };
      setCustomers(body.customers);
    } catch {
      setError('Não foi possível atualizar a lista de clientes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Relacionamento</p>
          <h1 className="mt-2 font-display text-4xl text-foreground">Clientes</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Consulte o histórico de visitas, recorrência e atendimento de cada cliente.</p>
        </div>
        <form onSubmit={refresh} className="flex w-full gap-2 sm:max-w-xl">
          <label className="sr-only" htmlFor="customer-search">Buscar cliente</label>
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input id="customer-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, telefone ou e-mail" className="admin-input w-full pl-10" maxLength={80} />
          </div>
          <button type="submit" disabled={isLoading} className="admin-primary-button shrink-0">
            {isLoading ? <LoaderCircle aria-label="Buscando" className="animate-spin" size={16} /> : <RefreshCw aria-hidden="true" size={16} />}
            <span className="hidden sm:inline">{isLoading ? 'Buscando' : 'Buscar'}</span>
          </button>
        </form>
      </header>

      {error && <p role="alert" className="mt-5 rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{error}</p>}

      <section className="mt-8 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-sm" aria-labelledby="customers-title">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3"><UsersRound aria-hidden="true" className="text-primary" size={20} /><div><h2 id="customers-title" className="font-display text-2xl text-foreground">Base de clientes</h2><p className="mt-1 text-xs text-muted">Até 100 clientes ordenados pela visita mais recente.</p></div></div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{number(customers.length)}</span>
        </div>
        {customers.length === 0 ? (
          <div className="px-6 py-14 text-center"><UserRound aria-hidden="true" className="mx-auto text-primary" size={28} /><p className="mt-3 text-sm text-muted">Nenhum cliente encontrado para esta busca.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Última visita</th><th className="px-4 py-3 font-semibold">Reservas</th><th className="px-4 py-3 font-semibold">Covers</th><th className="px-4 py-3 font-semibold">Indicadores</th><th className="px-4 py-3 font-semibold"><span className="sr-only">Ação</span></th></tr></thead>
              <tbody>{customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border align-top last:border-0">
                  <td className="px-4 py-4"><Link href={`/admin/clientes/${customer.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">{customer.name}</Link><span className="block text-xs text-muted">{customer.phone}</span><span className="block max-w-56 truncate text-xs text-muted">{customer.email ?? 'Sem e-mail'}</span></td>
                  <td className="px-4 py-4 text-sm text-foreground">{formatDate(customer.lastReservationDate)}<span className="mt-1 block text-xs text-muted">Primeira: {formatDate(customer.firstReservationDate)}</span></td>
                  <td className="px-4 py-4 text-sm text-foreground"><strong>{number(customer.reservationCount)}</strong><span className="mt-1 block text-xs text-muted">{number(customer.completedReservations)} concluídas</span></td>
                  <td className="px-4 py-4 text-sm text-foreground">{number(customer.totalCovers)}</td>
                  <td className="px-4 py-4 text-xs text-muted">{customer.noShowCount > 0 && <span className="block text-status-danger">{number(customer.noShowCount)} não compareceu</span>}{customer.marketingConsent ? <span className="block text-status-success">Marketing autorizado</span> : <span className="block">Sem marketing</span>}</td>
                  <td className="px-4 py-4 text-right"><Link href={`/admin/clientes/${customer.id}`} className="inline-flex items-center rounded-[var(--radius-sm)] border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary">Ver perfil</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
