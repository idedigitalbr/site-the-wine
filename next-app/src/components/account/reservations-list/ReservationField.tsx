import type { LucideIcon } from 'lucide-react';
import styles from './ReservationsList.module.css';

type ReservationFieldProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  className?: string;
  iconSize?: number;
};

export function ReservationField({
  icon: Icon,
  label,
  value,
  className = '',
  iconSize = 15,
}: ReservationFieldProps) {
  return (
    <div className={`${styles.fieldCell} ${className}`}>
      <Icon className={styles.fieldIcon} aria-hidden="true" size={iconSize} strokeWidth={1.6} />
      <dl className={styles.fieldCopy}>
        <dt className={styles.fieldLabel}>{label}</dt>
        <dd className={styles.fieldValue}>{value}</dd>
      </dl>
    </div>
  );
}
