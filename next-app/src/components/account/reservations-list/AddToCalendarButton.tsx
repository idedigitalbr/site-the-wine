'use client';

import { CalendarDays, ChevronDown, Download, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buildReservationCalendarEvent } from '@/lib/reservation-calendar';
import type { CustomerReservationItem } from '@/types/customer-reservations';
import styles from './ReservationsList.module.css';

export function AddToCalendarButton({ reservation }: { reservation: CustomerReservationItem }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const event = buildReservationCalendarEvent(reservation);

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => { if (!wrapperRef.current?.contains(event.target as Node)) closeMenu(); };
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeMenu(); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', keydown); };
  }, [open]);

  function downloadIcs() {
    if (!event) return;
    const blob = new Blob([event.ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = event.filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    closeMenu();
  }

  return (
    <div className={styles.calendarAction} ref={wrapperRef}>
      <button ref={triggerRef} type="button" className={styles.cardAction} disabled={!event} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" aria-controls={`calendar-menu-${reservation.id}`}>
        <CalendarDays size={15} aria-hidden="true" /> Adicionar ao calendário <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && event && <div className={styles.calendarMenu} id={`calendar-menu-${reservation.id}`} role="menu">
        <a className={styles.calendarMenuItem} href={event.googleUrl} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={closeMenu}><ExternalLink size={14} aria-hidden="true" />Google Agenda</a>
        <button className={styles.calendarMenuItem} type="button" role="menuitem" onClick={downloadIcs}><Download size={14} aria-hidden="true" />Baixar arquivo .ics</button>
      </div>}
      {!event && <span className={styles.actionHint}>Duração indisponível para adicionar ao calendário.</span>}
    </div>
  );
}
