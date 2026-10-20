import type { LucideIcon } from 'lucide-react';
import styles from './ReservationsList.module.css';

type ReservationFieldProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
};

export function ReservationField({ icon: Icon, label, value, className = '' }: ReservationFieldProps) {
  return (
    <div className={`${styles.fieldCell} ${className}`}>
      <Icon className={styles.fieldIcon} aria-hidden="true" size={18} strokeWidth={1.6} />
      <dl className={styles.fieldCopy}>
        <dt className={styles.fieldLabel}>{label}</dt>
        <dd className={styles.fieldValue}>{value}</dd>
      </dl>
    </div>
  );
}
