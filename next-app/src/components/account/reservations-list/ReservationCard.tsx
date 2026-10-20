'use client';

import { useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Hourglass,
  MessageSquareMore,
  SlidersHorizontal,
  Users,
  Wine,
} from 'lucide-react';
import type { CustomerReservationItem } from '@/types/customer-reservations';
import { ReservationField } from './ReservationField';
import { ReservationStatusBadge } from './ReservationStatusBadge';
import {
  formatCompactDurationParts,
  formatCompactGuestParts,
  formatGuestCount,
  formatReservationDuration,
  formatReservationNotes,
  formatReservationTicketDate,
  formatSpecialNeeds,
  type ReservationTicketDateParts,
} from './reservationCardFormatters';
import styles from './ReservationsList.module.css';

export function TicketCutouts() {
  return (
    <span className={styles.ticketCutouts} aria-hidden="true">
      <span className={`${styles.cornerCutout} ${styles.cornerTopLeft}`} />
      <span className={`${styles.cornerCutout} ${styles.cornerTopRight}`} />
      <span className={`${styles.cornerCutout} ${styles.cornerBottomLeft}`} />
      <span className={`${styles.cornerCutout} ${styles.cornerBottomRight}`} />
      <span className={`${styles.sideNotch} ${styles.sideNotchLeft}`} />
      <span className={`${styles.sideNotch} ${styles.sideNotchRight}`} />
      <span className={`${styles.seamNotch} ${styles.seamNotchTop}`} />
      <span className={`${styles.seamNotch} ${styles.seamNotchBottom}`} />
    </span>
  );
}

function TicketDateStub({ dateParts }: { dateParts: ReservationTicketDateParts }) {
  return (
    <div className={styles.ticketStub}>
      <div className={styles.desktopStubContent}>
        <div className={styles.stubHeader}>
          <CalendarDays className={styles.stubCalendarIcon} aria-hidden="true" size={18} strokeWidth={1.6} />
          <span className={styles.stubDataHeading}>DATA</span>
        </div>
        <div className={styles.stubDateRow}>
          <span className={styles.stubDayNumber}>{dateParts.day}</span>
          <span className={styles.stubMonthYear}>
            <span>{dateParts.monthYearLine1}</span>
            <span>{dateParts.monthYearLine2}</span>
          </span>
        </div>
        <span className={styles.stubWeekday}>{dateParts.weekdayLong}</span>
      </div>

      <div className={styles.mobileStubContent} aria-hidden="true">
        <span className={styles.mobileStubDay}>{dateParts.day}</span>
        <span className={styles.mobileStubMonth}>{dateParts.monthShort}</span>
        <span className={styles.mobileStubYear}>{dateParts.year}</span>
        <span className={styles.mobileStubWeekday}>{dateParts.weekdayShort}</span>
      </div>
    </div>
  );
}

type DesktopTicketBodyProps = {
  reservation: CustomerReservationItem;
  durationText: string;
  guestText: string;
  preferencesText: string;
  notesText: string;
};

function DesktopTicketBody({
  reservation,
  durationText,
  guestText,
  preferencesText,
  notesText,
}: DesktopTicketBodyProps) {
  return (
    <div className={styles.desktopTicketMain}>
      <div className={styles.desktopCenterGrid}>
        <div className={styles.desktopTopRow}>
          <ReservationField icon={Clock3} label="HORÁRIO" value={reservation.startTime} className={styles.colFirst} />
          <ReservationField icon={Hourglass} label="DURAÇÃO" value={durationText} className={styles.colDivider} />
          <ReservationField icon={Users} label="PESSOAS" value={guestText} className={styles.colDivider} />
        </div>
        <div className={styles.desktopBottomRow}>
          <ReservationField
            icon={SlidersHorizontal}
            label="PREFERÊNCIAS"
            value={preferencesText}
            className={`${styles.colFirst} ${styles.compactValueField}`}
          />
          <ReservationField
            icon={MessageSquareMore}
            label="OBSERVAÇÕES"
            value={notesText}
            className={`${styles.colDivider} ${styles.compactValueField}`}
          />
        </div>
      </div>

      <div className={styles.desktopRightZone}>
        <ReservationStatusBadge status={reservation.status} />
        <Wine className={styles.wineWatermark} aria-hidden="true" size={42} strokeWidth={1.25} />
      </div>
    </div>
  );
}

type MobileTicketBodyProps = {
  reservation: CustomerReservationItem;
  preferencesText: string;
  notesText: string;
  isExpanded: boolean;
  onToggle: () => void;
};

function MobileTicketBody({
  reservation,
  preferencesText,
  notesText,
  isExpanded,
  onToggle,
}: MobileTicketBodyProps) {
  const durationParts = formatCompactDurationParts(reservation.durationMinutes);
  const guestParts = formatCompactGuestParts(reservation.guestCount);

  return (
    <div className={styles.mobileTicketMain} data-mobile-expanded={isExpanded ? 'true' : 'false'}>
      <header className={styles.mobileHeaderRow}>
        <h2 className={styles.mobileCardTitle}>Reserva</h2>
        <ReservationStatusBadge status={reservation.status} />
      </header>

      <button
        type="button"
        className={styles.mobileSummaryButton}
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <span className={styles.mobileMetricCell}>
          <Clock3 className={styles.fieldIcon} aria-hidden="true" size={15} strokeWidth={1.6} />
          <span className={styles.mobileMetricSingle}>{reservation.startTime}</span>
        </span>
        <span className={`${styles.mobileMetricCell} ${styles.mobileMetricDivider}`}>
          <Hourglass className={styles.fieldIcon} aria-hidden="true" size={15} strokeWidth={1.6} />
          <span className={styles.mobileMetricStack}>
            <span>{durationParts.primary}</span>
            {durationParts.unit && <span className={styles.mobileMetricUnit}>{durationParts.unit}</span>}
          </span>
        </span>
        <span className={`${styles.mobileMetricCell} ${styles.mobileMetricDivider}`}>
          <Users className={styles.fieldIcon} aria-hidden="true" size={15} strokeWidth={1.6} />
          <span className={styles.mobileMetricStack}>
            <span>{guestParts.count}</span>
            <span className={styles.mobileMetricUnit}>{guestParts.unit}</span>
          </span>
        </span>
        {!isExpanded && <ChevronRight className={styles.mobileChevron} aria-hidden="true" size={14} strokeWidth={1.8} />}
      </button>

      <div className={styles.mobileDetailsPanel}>
        <ReservationField
          icon={SlidersHorizontal}
          label="Preferências"
          value={preferencesText}
          iconSize={17}
          className={styles.mobileDetailField}
        />
        <ReservationField
          icon={MessageSquareMore}
          label="Observações"
          value={notesText}
          iconSize={17}
          className={styles.mobileDetailField}
        />
      </div>
    </div>
  );
}

type ReservationCardProps = {
  reservation: CustomerReservationItem;
  defaultMobileExpanded?: boolean;
};

export function ReservationCard({
  reservation,
  defaultMobileExpanded = false,
}: ReservationCardProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(defaultMobileExpanded);
  const dateParts = formatReservationTicketDate(reservation.reservationDate);
  const durationText = formatReservationDuration(reservation.durationMinutes);
  const guestText = formatGuestCount(reservation.guestCount);
  const preferencesText = formatSpecialNeeds(reservation.specialNeeds);
  const notesText = formatReservationNotes(reservation.notes);

  return (
    <article
      className={`${styles.ticketClip} ${styles.reservationTicket}`}
      data-reservation-card
      aria-label={`Reserva em ${dateParts.fullLabel} às ${reservation.startTime}`}
    >
      <TicketCutouts />
      <div className={styles.ticketSurface}>
        <TicketDateStub dateParts={dateParts} />
        <DesktopTicketBody
          reservation={reservation}
          durationText={durationText}
          guestText={guestText}
          preferencesText={preferencesText}
          notesText={notesText}
        />
        <MobileTicketBody
          reservation={reservation}
          preferencesText={preferencesText}
          notesText={notesText}
          isExpanded={isMobileExpanded}
          onToggle={() => setIsMobileExpanded((current) => !current)}
        />
      </div>
    </article>
  );
}
