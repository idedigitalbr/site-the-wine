'use client';

import { Armchair, CalendarDays, CircleAlert, Clock3, LoaderCircle } from 'lucide-react';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { ReservationCalendar } from './ReservationCalendar';

type Slot = { startTime: string; endTime: string; availableTableCount: number; eligibleGuestCounts: number[] };
type FormValues = { date: string; time: string };

function FieldError({ message }: { message?: string }) { return message ? <p className="reservation-field-error" role="alert">{message}</p> : null; }

function AvailabilityState({ slots, isLoading, hasError, selectedTime, setValue }: { slots: Slot[]; isLoading: boolean; hasError: boolean; selectedTime: string; setValue: UseFormSetValue<FormValues> }) {
  if (isLoading) return <div className="reservation-data-state" role="status"><LoaderCircle aria-hidden="true" className="animate-spin" size={18} />Consultando os horários do salão…</div>;
  if (hasError) return <div className="reservation-data-state reservation-data-state-error" role="alert"><CircleAlert aria-hidden="true" size={18} />Não foi possível consultar a disponibilidade agora. Tente novamente.</div>;
  if (slots.length === 0) return <div className="reservation-data-state"><CircleAlert aria-hidden="true" size={18} />Escolha uma data para consultar os horários disponíveis.</div>;
  return <div className="reservation-time-grid" aria-label="Horários disponíveis">{slots.map((slot) => <button key={slot.startTime} type="button" onClick={() => setValue('time', slot.startTime, { shouldValidate: true })} aria-pressed={selectedTime === slot.startTime} className={`reservation-time-choice ${selectedTime === slot.startTime ? 'reservation-time-choice-selected' : ''}`}><Clock3 aria-hidden="true" size={14} />{slot.startTime}</button>)}</div>;
}

export function StepDateAndTime({ register, selectedDate, dateError, timeError, slots, isLoading, hasError, selectedTime, setValue }: { register: UseFormRegister<FormValues>; selectedDate: string; dateError?: string; timeError?: string; slots: Slot[]; isLoading: boolean; hasError: boolean; selectedTime: string; setValue: UseFormSetValue<FormValues> }) {
  const minDate = new Date().toISOString().slice(0, 10);
  const selectedSlot = slots.find((slot) => slot.startTime === selectedTime);
  return <div className="reservation-date-step">
    <input {...register('date')} type="date" min={minDate} tabIndex={-1} aria-hidden="true" className="reservation-date-field" />
    <div className="reservation-step-heading"><CalendarDays aria-hidden="true" size={24} /><div><h2>Selecione a data da reserva</h2><p>Escolha um dia disponível no nosso calendário.</p></div></div>
    <div className="reservation-date-layout">
      <ReservationCalendar value={selectedDate} minDate={minDate} onChange={(value) => { setValue('date', value, { shouldDirty: true, shouldTouch: true, shouldValidate: true }); setValue('time', '', { shouldDirty: true, shouldValidate: true }); }} />
      <div className="reservation-time-panel">
        <div className="reservation-step-heading reservation-step-heading-compact"><Clock3 aria-hidden="true" size={22} /><div><h2>Escolha um horário</h2><p>Selecione o melhor momento para sua experiência.</p></div></div>
        <AvailabilityState slots={slots} isLoading={isLoading} hasError={hasError} selectedTime={selectedTime} setValue={setValue} />
        {selectedSlot && <div className="reservation-availability-note"><Armchair aria-hidden="true" size={19} /><div><strong>{selectedSlot.availableTableCount} mesas disponíveis para o horário selecionado</strong><span>A alocação será confirmada ao informar o número de pessoas.</span></div></div>}
        {dateError && <FieldError message={dateError} />}{timeError && <FieldError message={timeError} />}
      </div>
    </div>
  </div>;
}
