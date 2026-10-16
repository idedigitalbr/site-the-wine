export type ReservationAttemptState = 'active' | 'confirmed' | 'expired' | 'invalidated';

export type ReservationAttemptSelection = {
  date?: string;
  time?: string;
  guests?: number;
  duration?: number;
  tableIds?: number[];
  specialNeeds?: string[];
  notes?: string;
};

export type ReservationAttemptContext = {
  attemptId: string;
  flowId: string;
  userId: string;
  customerId: number;
  sessionTokenHash: string;
  revision: number;
  state: ReservationAttemptState;
  selection: ReservationAttemptSelection | null;
  holdId?: number | null;
  holdExpiresAt?: number | null;
  reservationId?: number | null;
  expiresAt: string;
};

export type ReservationAttemptOwner = Pick<ReservationAttemptContext, 'userId' | 'customerId' | 'sessionTokenHash'>;

export function assertAttemptOwner(attempt: ReservationAttemptContext, owner: ReservationAttemptOwner): void {
  if (attempt.userId !== owner.userId || attempt.customerId !== owner.customerId || attempt.sessionTokenHash !== owner.sessionTokenHash) {
    throw new Error('attempt_owner_mismatch');
  }
}

export function assertAttemptRevision(attempt: ReservationAttemptContext, expectedRevision: number): void {
  if (attempt.revision !== expectedRevision) throw new Error('selection_outdated');
}

export function assertAttemptWritable(attempt: Pick<ReservationAttemptContext, 'state'>): void {
  if (attempt.state === 'confirmed') throw new Error('attempt_confirmed');
  if (attempt.state === 'expired') throw new Error('attempt_expired');
  if (attempt.state === 'invalidated') throw new Error('attempt_invalidated');
}

export function advanceAttemptRevision(
  attempt: ReservationAttemptContext,
  expectedRevision: number,
  selection: ReservationAttemptSelection,
): ReservationAttemptContext {
  assertAttemptWritable(attempt);
  assertAttemptRevision(attempt, expectedRevision);
  return { ...attempt, revision: attempt.revision + 1, selection };
}
