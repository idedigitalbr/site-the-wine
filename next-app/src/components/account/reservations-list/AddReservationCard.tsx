import Link from 'next/link';
import { Plus } from 'lucide-react';
import styles from './ReservationsList.module.css';

export function AddReservationCard() {
  return (
    <Link className={styles.addReservationCard} href="/reservas" aria-label="Adicionar reserva">
      <span className={styles.addIconCircle}>
        <Plus aria-hidden="true" size={26} strokeWidth={1.3} />
      </span>
      <span className={styles.addLabel}>Adicionar reserva</span>
    </Link>
  );
}
