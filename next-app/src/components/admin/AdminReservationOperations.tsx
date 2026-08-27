'use client';

import { Check, LoaderCircle, LogIn, UserX, Utensils } from 'lucide-react';
import { useState } from 'react';
import type { ReservationOperation } from '@/modules/reservations/domain/reservation-operation';
import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';

type Props = {
  id: number;
  status: ReservationStatus;
  checkedInAt: string | null;
  onChanged: (status: ReservationStatus, checkedInAt: boolean) => void;
};

const operationLabels: Record<ReservationOperation, string> = {
  check_in: 'Check-in',
  seat: 'Sentar',
  complete: 'Concluir',
  no_show: 'Não compareceu',
};

const operationIcons: Record<ReservationOperation, typeof Check> = {
  check_in: LogIn,
  seat: Utensils,
  complete: Check,
  no_show: UserX,
};

function availableOperations(status: ReservationStatus, checkedInAt: string | null): ReservationOperation[] {
  if (status === 'confirmed' && !checkedInAt) return ['check_in', 'no_show'];
  if (status === 'confirmed') return ['seat', 'no_show'];
  if (status === 'seated') return ['complete', 'no_show'];
  return [];
}

export function AdminReservationOperations({ id, status, checkedInAt, onChanged }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);
  const operations = availableOperations(status, checkedInAt);

  if (operations.length === 0) return null;

  const update = async (operation: ReservationOperation) => {
    setIsSaving(true);
    setError(false);
    try {
      const response = await fetch(`/api/admin/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation }),
      });
      if (!response.ok) throw new Error('operation_failed');
      onChanged(operation === 'check_in' ? 'confirmed' : operation === 'seat' ? 'seated' : operation === 'complete' ? 'completed' : 'no_show', operation === 'check_in' || Boolean(checkedInAt));
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {operations.map((operation) => {
        const Icon = operationIcons[operation];
        return <button key={operation} type="button" onClick={() => update(operation)} disabled={isSaving} className="admin-secondary-button px-2 py-1 text-[11px]" title={operationLabels[operation]}><Icon aria-hidden="true" size={13} />{operationLabels[operation]}</button>;
      })}
      {isSaving && <LoaderCircle aria-label="Salvando operação" className="animate-spin text-primary" size={15} />}
      {error && <span className="text-[11px] text-status-danger">Não salvo</span>}
    </div>
  );
}
