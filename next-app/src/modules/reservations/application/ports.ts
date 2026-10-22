import type { ReservationDraft } from '../domain/reservation';
import type { ReservationStatus } from '../domain/reservation-status';
import type { PaymentStatus } from '@/modules/payments/domain/payment';
import type {
  AvailabilityInventory,
  AvailabilitySearchQuery,
} from '../domain/availability';
import type { ReservationHoldSelection } from '../domain/hold';
import type { WaitlistStatus } from '../domain/waitlist';

export type ReservationId = number;

export type CustomerReservationRecord = {
  id: ReservationId;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus | null;
  specialNeeds: string[];
  notes: string;
};

export interface CustomerReservationQueryRepository {
  listByCustomerId(
    customerId: number,
    page: { offset: number; limit: number },
  ): Promise<CustomerReservationRecord[]>;
}

export type CustomerUpsertInput = {
  name: string;
  phone: string;
  normalizedPhone: string;
  email: string;
  marketingConsent: boolean;
};

export type CreatedReservationHold = {
  holdId: number;
  tableIds: number[];
  expiresAt: number;
};

export type CreateWaitlistEntryInput = {
  customerId: number;
  reservationDate: string;
  preferredTime: string | null;
  guestCount: number;
  notes: string;
};

export type CreatedWaitlistEntry = {
  waitlistId: number;
  referenceCode: string;
  status: 'waiting';
};

export type ConfirmReservationWithHoldInput = {
  reservation: ReservationDraft;
  tableIds: number[];
  sessionTokenHash: string;
  specialNeeds: string[];
  specialNeedsOther: string;
};

export type ReservationAttemptHoldInput = ReservationHoldSelection & {
  attemptId: string;
  expectedRevision: number;
  operationKey: string;
  ownerUserId: string;
  ownerCustomerId: number;
};

export type EncryptedReservationReplay = {
  ciphertext: string;
  nonce: string;
  authTag: string;
  keyVersion: string;
  expiresAt: string;
};

export type ConfirmReservationAttemptInput = ConfirmReservationWithHoldInput & {
  attemptId: string;
  expectedRevision: number;
  ownerUserId: string;
  ownerCustomerId: number;
  operationKey: string;
  contentFingerprint: string;
  replay: EncryptedReservationReplay;
  notificationDedupeKey: string;
};

export type ConfirmReservationAttemptResult = {
  kind: 'created' | 'replay';
  reservationId: number;
  publicCode: string;
  replay: EncryptedReservationReplay;
};

export interface ReservationRepository {
  create(input: ReservationDraft): Promise<ReservationId>;
  assignTables(reservationId: ReservationId, tableIds: number[]): Promise<void>;
  addSpecialNeeds(reservationId: ReservationId, needs: string[], details: string): Promise<void>;
  createHold(input: ReservationHoldSelection): Promise<CreatedReservationHold>;
  createHoldForAttempt(input: ReservationAttemptHoldInput): Promise<CreatedReservationHold>;
  confirmWithHold(input: ConfirmReservationWithHoldInput): Promise<ReservationId>;
  confirmReservationAttempt(input: ConfirmReservationAttemptInput): Promise<ConfirmReservationAttemptResult>;
}

export type PortalReservation = {
  id: ReservationId;
  publicCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  status: ReservationStatus;
  customerName: string;
  tableLabel: string | null;
};

export type ReservationNotificationContact = {
  email: string | null;
};

export interface ReservationPortalRepository {
  findByConfirmationTokenHash(tokenHash: string): Promise<PortalReservation | null>;
  findByPublicCode(publicCode: string): Promise<PortalReservation | null>;
  findNotificationContactByConfirmationTokenHash(tokenHash: string): Promise<ReservationNotificationContact | null>;
  cancel(id: ReservationId): Promise<void>;
}

export interface WaitlistRepository {
  create(input: CreateWaitlistEntryInput): Promise<number>;
}

export interface CustomerRepository {
  findByNormalizedPhone(normalizedPhone: string): Promise<number | null>;
  upsert(input: CustomerUpsertInput): Promise<number>;
}

export interface AvailabilityRepository {
  findInventory(query: AvailabilitySearchQuery, sessionTokenHash?: string | null): Promise<AvailabilityInventory>;
}
