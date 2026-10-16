'use client';

import { Armchair, ChevronDown, Info, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';

type Slot = { startTime: string; eligibleGuestCounts: number[]; availableTableCount: number };
type FormValues = { guests: number };
type GuestProps = { selectedGuests: number; selectedTime: string; slot?: Slot; selectedTableIds: number[]; hasActiveHold: boolean; error?: string };
const guestGroups = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const pluralize = (count: number) => `${count} ${count === 1 ? 'pessoa' : 'pessoas'}`;

function GuestGroup({ group, eligible, selectedGuests, onSelect }: { group: number[]; eligible: Set<number>; selectedGuests: number; onSelect: (count: number) => void }) {
  const unavailable = group.every((count) => !eligible.has(count));
  return <div className="reservation-guest-group"><div className="reservation-guest-group-heading"><span>{group[0]}–{group[group.length - 1]} pessoas</span>{unavailable && <span className="reservation-guest-unavailable">Indisponível</span>}</div><div className="reservation-guest-group-buttons">{group.map((count) => <button key={count} type="button" disabled={!eligible.has(count)} aria-pressed={selectedGuests === count} aria-label={pluralize(count)} onClick={() => onSelect(count)}>{count}</button>)}</div></div>;
}

function GuestOptions({ open, slot, eligible, selectedGuests, onSelect }: { open: boolean; slot?: Slot; eligible: Set<number>; selectedGuests: number; onSelect: (count: number) => void }) {
  if (!open) return null;
  return <div id="reservation-guest-options" className="reservation-guest-options" role="region" aria-label="Opções de quantidade de pessoas">{guestGroups.map((group) => <GuestGroup key={group[0]} group={group} eligible={eligible} selectedGuests={selectedGuests} onSelect={onSelect} />)}{!slot && <p className="reservation-guest-help">Escolha um horário para consultar as quantidades disponíveis.</p>}</div>;
}

function GuestSummary({ selectedGuests, selectedTableIds, hasActiveHold }: Pick<GuestProps, 'selectedGuests' | 'selectedTableIds' | 'hasActiveHold'>) {
  const physical = hasActiveHold && selectedTableIds.length > 0 ? `${selectedTableIds.length} mesas reservadas temporariamente` : 'Alocação ao continuar';
  const physicalDetail = hasActiveHold ? 'de acordo com a disponibilidade' : 'sujeita à confirmação';
  const option = hasActiveHold ? 'Opção válida' : 'Opção disponível';
  const optionDetail = hasActiveHold ? 'reservada temporariamente' : 'alocação ao continuar';
  const people = selectedGuests > 0 ? pluralize(selectedGuests) : 'A definir';
  const peopleDetail = selectedGuests > 0 ? 'no total' : 'informe seu grupo';
  return <div className="reservation-guest-summary" aria-label="Resumo da quantidade de pessoas"><div><Armchair aria-hidden="true" size={19} /><strong>{physical}</strong><span>{physicalDetail}</span></div><div><Users aria-hidden="true" size={19} /><strong>{people}</strong><span>{peopleDetail}</span></div><div><span className="reservation-guest-summary-dot" aria-hidden="true" /><strong>{option}</strong><span>{optionDetail}</span></div></div>;
}

export function StepGuests({ register, setValue, ...props }: { register: UseFormRegister<FormValues>; setValue: UseFormSetValue<FormValues> } & GuestProps) {
  const { selectedGuests, selectedTime, slot, error } = props;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const eligible = new Set(slot?.eligibleGuestCounts ?? []);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  const chooseGuests = (count: number) => { setValue('guests', count, { shouldDirty: true, shouldTouch: true, shouldValidate: true }); setOpen(false); triggerRef.current?.focus(); };
  const triggerLabel = selectedGuests > 0 ? pluralize(selectedGuests) : 'Selecione o número de pessoas';
  return <div className="reservation-people-step">
    <input {...register('guests', { valueAsNumber: true })} type="number" tabIndex={-1} aria-hidden="true" className="reservation-date-field" />
    <div className="reservation-step-heading"><Users aria-hidden="true" size={24} /><div><h2>Quantas pessoas participarão?</h2><p>Escolha o número de pessoas da sua reserva, de acordo com a disponibilidade de mesas para a data e horário selecionados.</p></div></div>
    <p className="reservation-selected-time">Horário selecionado: <strong>{selectedTime || 'selecione um horário'}</strong></p>
    <button ref={triggerRef} type="button" className={`reservation-guest-trigger ${open ? 'reservation-guest-trigger-open' : ''}`} aria-expanded={open} aria-controls="reservation-guest-options" onClick={() => setOpen((value) => !value)}><span>{triggerLabel}</span><ChevronDown aria-hidden="true" size={18} /></button>
    {error && <p className="reservation-field-error" role="alert">{error}</p>}
    <GuestOptions open={open} slot={slot} eligible={eligible} selectedGuests={selectedGuests} onSelect={chooseGuests} />
    {slot && <div className="reservation-guest-info"><Info aria-hidden="true" size={18} /><span>Esta quantidade está disponível para o horário escolhido. A alocação será confirmada ao continuar.</span></div>}
    <GuestSummary selectedGuests={selectedGuests} selectedTableIds={props.selectedTableIds} hasActiveHold={props.hasActiveHold} />
  </div>;
}
