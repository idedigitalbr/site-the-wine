'use client';

import { CalendarDays, LoaderCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { AdminReservation } from '@/modules/admin/application/ports';
import { ReservationStatusBadge, ReservationStatusControl } from './AdminReservationStatus';

function formatDate(date: string): string {
  return date.split('-').reverse().join('/');
}

function ReservationRow({ reservation }: { reservation: AdminReservation }) {
  return (
    <tr className="border-b border-border align-top last:border-0">
      <td className="px-4 py-4"><span className="font-semibold text-foreground">{reservation.startTime}</span><span className="block text-xs text-muted">até {reservation.endTime}</span><span className="mt-1 block text-xs text-muted">{formatDate(reservation.reservationDate)}</span></td>
      <td className="px-4 py-4"><span className="font-medium text-foreground">{reservation.customerName}</span><span className="block text-xs text-muted">{reservation.customerPhone}</span><span className="block max-w-48 truncate text-xs text-muted">{reservation.customerEmail ?? 'Sem e-mail'}</span></td>
      <td className="px-4 py-4 text-sm text-muted"><span className="block">{reservation.guestCount} {reservation.guestCount === 1 ? 'pessoa' : 'pessoas'}</span><span className="mt-1 block text-xs">{reservation.tableLabel ?? 'Mesa a definir'}</span></td>
      <td className="px-4 py-4"><ReservationStatusBadge status={reservation.status} /><div className="mt-3"><ReservationStatusControl id={reservation.id} status={reservation.status} /></div></td>
    </tr>
  );
}

export function AdminReservationsView({ initialReservations, initialDate }: { initialReservations: AdminReservation[]; initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [reservations, setReservations] = useState(initialReservations);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDate = async (nextDate: string) => {
    setDate(nextDate);
    setIsLoading(true);
    setError('');
    const response = await fetch(`/api/admin/reservations?date=${encodeURIComponent(nextDate)}`);
    if (response.ok) setReservations((await response.json()).reservations as AdminReservation[]);
    else setError('Não foi possível atualizar a agenda.');
    setIsLoading(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Operação</p><h1 className="mt-2 font-display text-4xl text-foreground">Reservas</h1><p className="mt-2 text-sm text-muted">Consulte a agenda e atualize os estados do atendimento.</p></div><label className="flex items-center gap-3 text-sm font-semibold text-foreground"><CalendarDays aria-hidden="true" className="text-primary" size={18} /><input type="date" value={date} onChange={(event) => loadDate(event.target.value)} className="admin-input w-auto" /></label></header>
      {error && <p role="alert" className="mt-5 rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{error}</p>}
      <section className="mt-8 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6"><div><h2 className="font-display text-2xl text-foreground">Agenda de {formatDate(date)}</h2><p className="mt-1 text-xs text-muted">Até 100 registros mais recentes</p></div>{isLoading ? <LoaderCircle aria-label="Atualizando" className="animate-spin text-primary" size={20} /> : <RefreshCw aria-hidden="true" className="text-primary" size={20} />}</div>
        {reservations.length === 0 ? <p className="px-6 py-14 text-center text-sm text-muted">Nenhuma reserva encontrada para esta data.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-semibold">Horário</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Grupo / mesa</th><th className="px-4 py-3 font-semibold">Status / ação</th></tr></thead><tbody>{reservations.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} />)}</tbody></table></div>}
      </section>
    </div>
  );
}
