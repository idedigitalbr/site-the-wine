import Link from 'next/link';
import { ArrowRight, Plus, Wine } from 'lucide-react';
import { TicketCutouts } from './ReservationCard';
import styles from './ReservationsList.module.css';

export function AddReservationCard() {
  return (
    <Link
      className={`${styles.ticketClip} ${styles.addReservationCard}`}
      href="/reservas"
      aria-label="Adicionar reserva"
    >
      <TicketCutouts />
      <div className={`${styles.ticketSurface} ${styles.addTicketSurface}`}>
        <span className={`${styles.ticketStub} ${styles.addTicketStub}`}>
          <span className={styles.addIconCircle}>
            <Plus aria-hidden="true" size={20} strokeWidth={1.5} />
          </span>
        </span>

        <span className={styles.addCopyGroup}>
          <span className={styles.addLabel}>Adicionar reserva</span>
          <span className={styles.addSubLabel}>AGENDAR UMA NOVA EXPERIÊNCIA</span>
        </span>

        <span className={styles.addRightZone}>
          <span className={styles.addArrowCircle}>
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.6} />
          </span>
          <Wine className={styles.wineWatermark} aria-hidden="true" size={38} strokeWidth={1.25} />
        </span>
      </div>
    </Link>
  );
}
