import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';
import type { PaymentStatus } from '@/modules/payments/domain/payment';

export interface CustomerReservationItem {
  id: number;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  durationMinutes: number | null;
  guestCount: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus | null;
  timeZone: string;
  specialNeeds: string[];
  notes: string;
}

export interface CustomerReservationsResponse {
  reservations: CustomerReservationItem[];
  nextOffset: number | null;
}
