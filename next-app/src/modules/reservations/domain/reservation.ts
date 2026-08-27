import { assertValidReservationWindow, type ReservationWindow } from './reservation-policy';
import type { ReservationStatus } from './reservation-status';

export const reservationSources = [
  'website',
  'admin',
  'phone',
  'whatsapp',
  'walk_in',
  'instagram',
  'google',
] as const;

export type ReservationSource = typeof reservationSources[number];

export type CreateReservationInput = ReservationWindow & {
  publicCode: string;
  customerId: number;
  experienceId?: number | null;
  preferredTableTypeId?: number | null;
  source?: ReservationSource;
  notes?: string | null;
  internalNotes?: string | null;
  confirmationTokenHash?: string | null;
};

export type ReservationDraft = CreateReservationInput & {
  status: 'draft';
};

export type Reservation = ReservationDraft & {
  id: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
};

export function createDraftReservation(input: CreateReservationInput): ReservationDraft {
  assertValidReservationWindow(input);

  if (!input.publicCode.trim()) throw new Error('publicCode is required');
  if (!Number.isInteger(input.customerId) || input.customerId < 1) {
    throw new Error('customerId is required');
  }

  return {
    ...input,
    source: input.source ?? 'website',
    status: 'draft',
  };
}
