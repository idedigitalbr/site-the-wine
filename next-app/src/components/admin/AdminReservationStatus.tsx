'use client';

import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { reservationStatuses, type ReservationStatus } from '@/modules/reservations/domain/reservation-status';

export const reservationStatusLabels: Record<ReservationStatus, string> = {
  draft: 'Rascunho',
  hold: 'Em espera',
  payment_pending: 'Pagamento pendente',
  pending: 'Pendente',
  confirmed: 'Confirmada',
  seated: 'Em atendimento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
  expired: 'Expirada',
};

const statusClasses: Record<ReservationStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  hold: 'bg-amber-100 text-amber-800',
  payment_pending: 'bg-amber-100 text-amber-800',
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  seated: 'bg-blue-100 text-blue-800',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-red-100 text-red-800',
  expired: 'bg-slate-100 text-slate-600',
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses[status]}`}>{reservationStatusLabels[status]}</span>;
}

export function ReservationStatusControl({ id, status }: { id: number; status: ReservationStatus }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const update = async (nextStatus: ReservationStatus) => {
    setIsSaving(true);
    setError(false);
    const response = await fetch(`/api/admin/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (response.ok) setCurrentStatus(nextStatus);
    else setError(true);
    setIsSaving(false);
  };

  return (
    <div className="flex items-center gap-2">
      {isSaving && <LoaderCircle aria-label="Salvando" className="animate-spin text-primary" size={15} />}
      <select aria-label={`Status da reserva ${id}`} value={currentStatus} onChange={(event) => update(event.target.value as ReservationStatus)} disabled={isSaving} className="rounded border border-border bg-surface px-2 py-1.5 text-xs text-foreground">
        {reservationStatuses.map((option) => <option key={option} value={option}>{reservationStatusLabels[option]}</option>)}
      </select>
      {error && <span className="text-[11px] text-status-danger">Não salvo</span>}
    </div>
  );
}
