'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';

type ReservationCalendarProps = { value: string; minDate: string; onChange: (value: string) => void };
const monthNames = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const fullDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const weekdayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function isoDate(date: Date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
function parseIsoDate(value: string) { const [year, month, day] = value.split('-').map(Number); return year && month && day ? new Date(year, month - 1, day, 12) : null; }
function monthStart(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
function addDays(date: Date, amount: number) { const next = new Date(date); next.setDate(date.getDate() + amount); return next; }

export function ReservationCalendar({ value, minDate, onChange }: ReservationCalendarProps) {
  const selectedDate = parseIsoDate(value);
  const minimumDate = parseIsoDate(minDate) ?? new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(selectedDate ?? minimumDate));
  const days = useMemo(() => {
    const first = monthStart(visibleMonth);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const totalDays = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
    return Array.from({ length: totalDays }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  }, [visibleMonth]);
  const shiftMonth = (offset: number) => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  const handleDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: Date) => {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    const next = addDays(day, offset);
    const nextIso = isoDate(next);
    if (next.getMonth() !== visibleMonth.getMonth() || nextIso < isoDate(minimumDate)) return;
    event.preventDefault();
    onChange(nextIso);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[aria-label="${fullDateFormatter.format(next)}"]`)?.focus());
  };
  return (
    <div className="reservation-calendar" aria-label="Calendário para escolher a data">
      <div className="reservation-calendar-heading">
        <button type="button" className="reservation-icon-button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior"><ChevronLeft aria-hidden="true" size={18} /></button>
        <strong>{monthNames.format(visibleMonth).replace(/^./, (letter) => letter.toUpperCase())}</strong>
        <button type="button" className="reservation-icon-button" onClick={() => shiftMonth(1)} aria-label="Próximo mês"><ChevronRight aria-hidden="true" size={18} /></button>
      </div>
      <div className="reservation-calendar-grid" role="grid" aria-label={monthNames.format(visibleMonth)}>
        {weekdayNames.map((day) => <span key={day} className="reservation-calendar-weekday" role="columnheader">{day}</span>)}
        {days.map((day) => {
          const dayIso = isoDate(day); const inMonth = day.getMonth() === visibleMonth.getMonth(); const disabled = !inMonth || dayIso < isoDate(minimumDate); const selected = dayIso === value;
          return <button key={dayIso} type="button" className={`reservation-calendar-day ${inMonth ? '' : 'reservation-calendar-day-muted'} ${selected ? 'reservation-calendar-day-selected' : ''}`} disabled={disabled} aria-pressed={selected} aria-label={fullDateFormatter.format(day)} onKeyDown={(event) => handleDayKeyDown(event, day)} onClick={() => onChange(dayIso)}>{day.getDate()}</button>;
        })}
      </div>
    </div>
  );
}
