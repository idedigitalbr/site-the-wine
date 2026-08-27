'use client';

import { Armchair, Check, LoaderCircle, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import type { FloorTable } from '@/modules/admin/application/ports';

type Props = {
  id: number;
  tableIds: number[];
  onChanged: (tableIds: number[], tableLabel: string | null) => void;
};

function isSelectable(table: FloorTable, currentIds: number[]): boolean {
  return table.state === 'available' || currentIds.includes(table.id);
}

export function AdminReservationAssignment({ id, tableIds, onChanged }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<FloorTable[]>([]);
  const [selected, setSelected] = useState<number[]>(tableIds);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const open = async () => {
    setIsLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/admin/reservations/${id}/assignment`);
      if (!response.ok) throw new Error('assignment_failed');
      const body = await response.json() as { tableIds: number[]; options: FloorTable[] };
      setSelected(body.tableIds);
      setOptions(body.options);
      setIsOpen(true);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (tableId: number) => {
    setSelected((current) => current.includes(tableId) ? current.filter((idValue) => idValue !== tableId) : [...current, tableId]);
  };

  const save = async () => {
    setIsSaving(true);
    setError(false);
    try {
      const response = await fetch(`/api/admin/reservations/${id}/assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableIds: selected }),
      });
      if (!response.ok) throw new Error('assignment_failed');
      const label = options.filter((table) => selected.includes(table.id)).map((table) => `${table.code} · ${table.name}`).join(', ') || null;
      onChanged(selected, label);
      setIsOpen(false);
    } catch {
      setError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-2">
      <button type="button" onClick={open} disabled={isLoading} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
        {isLoading ? <LoaderCircle aria-label="Carregando mesas" className="animate-spin" size={13} /> : <Armchair aria-hidden="true" size={13} />}
        {tableIds.length > 0 ? 'Trocar mesa' : 'Atribuir mesa'}
      </button>
      {error && <p className="mt-1 text-[11px] text-status-danger">Mesas indisponíveis.</p>}
      {isOpen && <div className="mt-2 rounded border border-border bg-surface-muted p-2">
        <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-foreground"><MapPin aria-hidden="true" size={13} />Selecione mesas livres</p>
        <div className="grid max-h-40 gap-1 overflow-y-auto">
          {options.map((table) => {
            const checked = selected.includes(table.id);
            const selectable = isSelectable(table, tableIds);
            return <label key={table.id} className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] ${selectable ? 'cursor-pointer hover:bg-primary/10' : 'cursor-not-allowed opacity-50'}`}><input type="checkbox" checked={checked} disabled={!selectable || isSaving} onChange={() => toggle(table.id)} /><span>{table.code} · {table.name}</span><span className="ml-auto text-[10px] text-muted">{table.state === 'blocked' ? 'Bloqueada' : table.state === 'reserved' && !tableIds.includes(table.id) ? 'Ocupada' : `${table.capacityMax} lug.`}</span></label>;
          })}
        </div>
        <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setIsOpen(false)} disabled={isSaving} className="admin-secondary-button px-2 py-1 text-[11px]"><X aria-hidden="true" size={13} />Cancelar</button><button type="button" onClick={save} disabled={isSaving} className="admin-primary-button px-2 py-1 text-[11px]">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={13} /> : <Check aria-hidden="true" size={13} />}Salvar</button></div>
      </div>}
    </div>
  );
}
