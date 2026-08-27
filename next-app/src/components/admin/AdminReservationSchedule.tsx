'use client';

import { CalendarClock, Check, LoaderCircle, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Props = {
  id: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  onChanged: () => void;
};

export function AdminReservationSchedule({ id, reservationDate, startTime, endTime, onChanged }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(false);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/reservations/${id}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationDate: form.get('reservationDate'),
          startTime: form.get('startTime'),
          endTime: form.get('endTime'),
        }),
      });
      if (!response.ok) throw new Error('schedule_failed');
      setIsOpen(false);
      onChanged();
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-2">
      <button type="button" onClick={() => setIsOpen((value) => !value)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"><CalendarClock aria-hidden="true" size={13} />{isOpen ? 'Fechar horário' : 'Alterar horário'}</button>
      {isOpen && <form onSubmit={submit} className="mt-2 rounded border border-border bg-surface-muted p-2"><div className="grid gap-2 sm:grid-cols-3"><label className="text-[10px] font-semibold text-foreground">Data<input name="reservationDate" type="date" defaultValue={reservationDate} required className="admin-input mt-1 px-2 py-1 text-xs" /></label><label className="text-[10px] font-semibold text-foreground">Início<input name="startTime" type="time" defaultValue={startTime} required className="admin-input mt-1 px-2 py-1 text-xs" /></label><label className="text-[10px] font-semibold text-foreground">Fim<input name="endTime" type="time" defaultValue={endTime} required className="admin-input mt-1 px-2 py-1 text-xs" /></label></div><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setIsOpen(false)} disabled={isSaving} className="admin-secondary-button px-2 py-1 text-[11px]"><X aria-hidden="true" size={13} />Cancelar</button><button type="submit" disabled={isSaving} className="admin-primary-button px-2 py-1 text-[11px]">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={13} /> : <Check aria-hidden="true" size={13} />}Salvar</button></div>{error && <p role="alert" className="mt-2 text-[11px] text-status-danger">Horário indisponível ou reserva já iniciada.</p>}</form>}
    </div>
  );
}
