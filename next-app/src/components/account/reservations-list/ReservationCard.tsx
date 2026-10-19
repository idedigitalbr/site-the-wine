import {
  CalendarDays,
  Clock3,
  FileText,
  Hourglass,
  MessageSquareMore,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import type { CustomerReservationItem } from '@/types/customer-reservations';
import { ReservationField } from './ReservationField';
import { ReservationStatusBadge, reservationStatusVariants } from './ReservationStatusBadge';
import {
  formatGuestCount,
  formatReservationDate,
  formatReservationDuration,
  formatReservationNotes,
  formatSpecialNeeds,
} from './reservationCardFormatters';
import styles from './ReservationsList.module.css';

export function ReservationCard({ reservation }: { reservation: CustomerReservationItem }) {
  const date = formatReservationDate(reservation.reservationDate);
  const HeaderIcon = reservationStatusVariants[reservation.status] === 'confirmed'
    ? CalendarDays
    : FileText;

  return (
    <article className={styles.reservationCard} data-reservation-card aria-label={`Reserva em ${date} às ${reservation.startTime}`}>
      <header className={styles.cardHeader}>
        <div className={styles.cardTitleGroup}>
          <HeaderIcon className={styles.cardHeaderIcon} aria-hidden="true" size={19} strokeWidth={1.6} />
          <h2 className={styles.cardTitle}>Reserva</h2>
        </div>
        <ReservationStatusBadge status={reservation.status} />
      </header>
      <div className={styles.rowThreeCols}>
        <ReservationField icon={CalendarDays} label="Data" value={date} className={styles.colFirst} />
        <ReservationField icon={Clock3} label="Horário" value={reservation.startTime} className={styles.colDivider} />
        <ReservationField icon={Hourglass} label="Duração" value={formatReservationDuration(reservation.durationMinutes)} className={styles.colDivider} />
      </div>
      <div className={styles.rowTwoCols}>
        <ReservationField icon={Users} label="Pessoas" value={formatGuestCount(reservation.guestCount)} className={styles.colFirst} />
        <ReservationField icon={SlidersHorizontal} label="Preferências" value={formatSpecialNeeds(reservation.specialNeeds)} className={styles.colDivider} />
      </div>
      <div className={styles.rowFullCol}>
        <ReservationField icon={MessageSquareMore} label="Observações" value={formatReservationNotes(reservation.notes)} />
      </div>
    </article>
  );
}
