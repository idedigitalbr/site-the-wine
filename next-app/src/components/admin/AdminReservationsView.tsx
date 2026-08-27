'use client';

import { BellRing, CalendarDays, LoaderCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { AdminReservation, AdminWaitlistEntry } from '@/modules/admin/application/ports';
import { reservationSourceLabel } from '@/lib/admin-labels';
import { AdminReservationAssignment } from './AdminReservationAssignment';
import { AdminReservationOperations } from './AdminReservationOperations';
import { AdminReservationSchedule } from './AdminReservationSchedule';
import { AdminReservationTimeline } from './AdminReservationTimeline';
import { ReservationStatusBadge, ReservationStatusControl, WaitlistStatusBadge, WaitlistStatusControl } from './AdminReservationStatus';
import { AdminWalkInForm } from './AdminWalkInForm';

function formatDate(date: string): string {
  return date.split('-').reverse().join('/');
}

function formatPreferredTime(time: string | null): string {
  return time ?? 'Qualquer horário';
}

function canAssignTables(status: AdminReservation['status']): boolean {
  return status === 'pending' || status === 'confirmed' || status === 'seated';
}

function canEditSchedule(status: AdminReservation['status']): boolean {
  return status === 'pending' || status === 'confirmed';
}

function ReservationRow({ reservation, onChanged, onTablesChanged, onScheduleChanged }: { reservation: AdminReservation; onChanged: (id: number, status: AdminReservation['status'], checkedIn: boolean) => void; onTablesChanged: (id: number, tableIds: number[], tableLabel: string | null) => void; onScheduleChanged: () => void }) {
  return (
    <tr className="border-b border-border align-top last:border-0">
      <td className="px-4 py-4"><span className="font-semibold text-foreground">{reservation.startTime}</span><span className="block text-xs text-muted">até {reservation.endTime}</span><span className="mt-1 block text-xs text-muted">{formatDate(reservation.reservationDate)}</span></td>
      <td className="px-4 py-4"><span className="font-medium text-foreground">{reservation.customerName}</span><span className="block text-xs text-muted">{reservation.customerPhone}</span><span className="block max-w-48 truncate text-xs text-muted">{reservation.customerEmail ?? 'Sem e-mail'}</span>{reservation.source === 'walk_in' && <span className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{reservationSourceLabel(reservation.source)}</span>}</td>
      <td className="px-4 py-4 text-sm text-muted"><span className="block">{reservation.guestCount} {reservation.guestCount === 1 ? 'pessoa' : 'pessoas'}</span><span className="mt-1 block text-xs">{reservation.tableLabel ?? 'Mesa a definir'}</span></td>
      <td className="px-4 py-4"><ReservationStatusBadge status={reservation.status} /><div className="mt-3"><ReservationStatusControl key={`${reservation.id}-${reservation.status}`} id={reservation.id} status={reservation.status} onChanged={(status) => onChanged(reservation.id, status, Boolean(reservation.checkedInAt))} /></div><AdminReservationOperations id={reservation.id} status={reservation.status} checkedInAt={reservation.checkedInAt} onChanged={(status, checkedIn) => onChanged(reservation.id, status, checkedIn)} />{canAssignTables(reservation.status) && <AdminReservationAssignment id={reservation.id} tableIds={reservation.tableIds} onChanged={(tableIds, tableLabel) => onTablesChanged(reservation.id, tableIds, tableLabel)} />}{canEditSchedule(reservation.status) && <AdminReservationSchedule id={reservation.id} reservationDate={reservation.reservationDate} startTime={reservation.startTime} endTime={reservation.endTime} onChanged={onScheduleChanged} />}<AdminReservationTimeline id={reservation.id} /></td>
    </tr>
  );
}

function WaitlistRow({ entry }: { entry: AdminWaitlistEntry }) {
  return (
    <tr className="border-b border-border align-top last:border-0">
      <td className="px-4 py-4"><span className="font-semibold text-foreground">{formatDate(entry.reservationDate)}</span><span className="block text-xs text-muted">{formatPreferredTime(entry.preferredTime)}</span><span className="mt-1 block text-xs text-muted">{entry.referenceCode}</span></td>
      <td className="px-4 py-4"><span className="font-medium text-foreground">{entry.customerName}</span><span className="block text-xs text-muted">{entry.customerPhone}</span><span className="block max-w-48 truncate text-xs text-muted">{entry.customerEmail ?? 'Sem e-mail'}</span></td>
      <td className="px-4 py-4 text-sm text-muted">{entry.guestCount} {entry.guestCount === 1 ? 'pessoa' : 'pessoas'}<span className="mt-1 block max-w-56 truncate text-xs">{entry.notes ?? 'Sem observações'}</span></td>
      <td className="px-4 py-4"><WaitlistStatusBadge status={entry.status} /><div className="mt-3"><WaitlistStatusControl id={entry.id} status={entry.status} /></div></td>
    </tr>
  );
}

export function AdminReservationsView({ initialReservations, initialWaitlist, initialDate }: { initialReservations: AdminReservation[]; initialWaitlist: AdminWaitlistEntry[]; initialDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [reservations, setReservations] = useState(initialReservations);
  const [waitlist, setWaitlist] = useState(initialWaitlist);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const updateReservation = (id: number, status: AdminReservation['status'], checkedIn: boolean) => {
    setReservations((items) => items.map((item) => item.id === id ? { ...item, status, checkedInAt: checkedIn ? item.checkedInAt ?? new Date().toISOString() : item.checkedInAt } : item));
  };

  const updateReservationTables = (id: number, tableIds: number[], tableLabel: string | null) => {
    setReservations((items) => items.map((item) => item.id === id ? { ...item, tableIds, tableLabel } : item));
  };

  const loadDate = async (nextDate: string) => {
    setDate(nextDate);
    setIsLoading(true);
    setError('');
    const [reservationsResponse, waitlistResponse] = await Promise.all([
      fetch(`/api/admin/reservations?date=${encodeURIComponent(nextDate)}`),
      fetch(`/api/admin/waitlist?date=${encodeURIComponent(nextDate)}`),
    ]);
    if (reservationsResponse.ok && waitlistResponse.ok) {
      setReservations((await reservationsResponse.json()).reservations as AdminReservation[]);
      setWaitlist((await waitlistResponse.json()).waitlist as AdminWaitlistEntry[]);
    } else setError('Não foi possível atualizar a agenda.');
    setIsLoading(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Operação</p><h1 className="mt-2 font-display text-4xl text-foreground">Reservas</h1><p className="mt-2 text-sm text-muted">Consulte a agenda e atualize os estados do atendimento.</p></div><label className="flex items-center gap-3 text-sm font-semibold text-foreground"><CalendarDays aria-hidden="true" className="text-primary" size={18} /><input type="date" value={date} onChange={(event) => loadDate(event.target.value)} className="admin-input w-auto" /></label></header>
      {error && <p role="alert" className="mt-5 rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{error}</p>}
      <AdminWalkInForm date={date} onCreated={() => loadDate(date)} />
      <section className="mt-8 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6"><div><h2 className="font-display text-2xl text-foreground">Agenda de {formatDate(date)}</h2><p className="mt-1 text-xs text-muted">Até 100 registros mais recentes</p></div>{isLoading ? <LoaderCircle aria-label="Atualizando" className="animate-spin text-primary" size={20} /> : <RefreshCw aria-hidden="true" className="text-primary" size={20} />}</div>
        {reservations.length === 0 ? <p className="px-6 py-14 text-center text-sm text-muted">Nenhuma reserva encontrada para esta data.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-semibold">Horário</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Grupo / mesa</th><th className="px-4 py-3 font-semibold">Status / ação</th></tr></thead><tbody>{reservations.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} onChanged={updateReservation} onTablesChanged={updateReservationTables} onScheduleChanged={() => loadDate(date)} />)}</tbody></table></div>}
      </section>
      <section className="mt-8 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><BellRing aria-hidden="true" className="text-primary" size={20} /><div><h2 className="font-display text-2xl text-foreground">Lista de espera</h2><p className="mt-1 text-xs text-muted">Pedidos sem mesa disponível para {formatDate(date)}.</p></div></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{waitlist.length}</span></div>
        {waitlist.length === 0 ? <p className="px-6 py-10 text-center text-sm text-muted">Nenhum pedido na lista de espera para esta data.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-semibold">Data / preferência</th><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Grupo</th><th className="px-4 py-3 font-semibold">Status / ação</th></tr></thead><tbody>{waitlist.map((entry) => <WaitlistRow key={entry.id} entry={entry} />)}</tbody></table></div>}
      </section>
    </div>
  );
}
