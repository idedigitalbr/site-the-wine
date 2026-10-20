import type { ReservationStatus } from '@/modules/reservations/domain/reservation-status';

export interface CustomerReservationItem {
  id: number;
  reservationDate: string;
  startTime: string;
  durationMinutes: number | null;
  guestCount: number;
  status: ReservationStatus;
  specialNeeds: string[];
  notes: string;
}

export interface CustomerReservationsResponse {
  reservations: CustomerReservationItem[];
  nextOffset: number | null;
}
