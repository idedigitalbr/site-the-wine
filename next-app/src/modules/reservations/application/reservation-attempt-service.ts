import type {
  ReservationAttemptContext,
  ReservationAttemptOwner,
  ReservationAttemptSelection,
} from '../domain/reservation-attempt';

export type ReservationAttemptRepository = {
  findByFlowId: (flowId: string) => Promise<ReservationAttemptContext | null>;
  create: (input: Omit<ReservationAttemptContext, 'revision' | 'state' | 'selection'>) => Promise<ReservationAttemptContext>;
  updateIfRevision: (
    attemptId: string,
    expectedRevision: number,
    update: Partial<Pick<ReservationAttemptContext, 'revision' | 'selection' | 'state' | 'holdId' | 'holdExpiresAt' | 'reservationId'>>,
  ) => Promise<ReservationAttemptContext | null>;
};

export type ReservationAttemptInitialization = {
  flowId: string;
  userId: string;
  customerId: number;
  sessionTokenHash: string;
  expiresAt: string;
};

export type ReservationAttemptService = {
  getOrCreate: (input: ReservationAttemptInitialization) => Promise<ReservationAttemptContext>;
  advanceSelection: (input: ReservationAttemptInitialization & {
    attemptId: string;
    expectedRevision: number;
    selection: ReservationAttemptSelection;
  }) => Promise<ReservationAttemptContext>;
};

function assertOwner(attempt: ReservationAttemptContext, owner: ReservationAttemptOwner): void {
  if (attempt.userId !== owner.userId || attempt.customerId !== owner.customerId || attempt.sessionTokenHash !== owner.sessionTokenHash) {
    throw new Error('attempt_owner_mismatch');
  }
}

function assertWritable(attempt: ReservationAttemptContext): void {
  if (attempt.state === 'confirmed') throw new Error('attempt_confirmed');
  if (attempt.state === 'expired') throw new Error('attempt_expired');
  if (attempt.state === 'invalidated') throw new Error('attempt_invalidated');
}

export function createReservationAttemptService(
  repository: ReservationAttemptRepository,
  createAttemptId: () => string = crypto.randomUUID,
): ReservationAttemptService {
  const flowLocks = new Map<string, Promise<void>>();

  async function withFlowLock<T>(flowId: string, callback: () => Promise<T>): Promise<T> {
    const previous = flowLocks.get(flowId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const queued = previous.then(() => current);
    flowLocks.set(flowId, queued);
    await previous;
    try {
      return await callback();
    } finally {
      release();
      if (flowLocks.get(flowId) === queued) flowLocks.delete(flowId);
    }
  }

  async function getOrCreate(input: ReservationAttemptInitialization): Promise<ReservationAttemptContext> {
    return withFlowLock(input.flowId, async () => {
      const existing = await repository.findByFlowId(input.flowId);
      if (existing) {
        assertOwner(existing, input);
        return existing;
      }
      return repository.create({
        attemptId: createAttemptId(),
        flowId: input.flowId,
        userId: input.userId,
        customerId: input.customerId,
        sessionTokenHash: input.sessionTokenHash,
        expiresAt: input.expiresAt,
      });
    });
  }

  async function advanceSelection(input: ReservationAttemptService['advanceSelection'] extends (arg: infer T) => Promise<unknown> ? T : never): Promise<ReservationAttemptContext> {
    return withFlowLock(input.flowId, async () => {
      const attempt = await repository.findByFlowId(input.flowId);
      if (!attempt || attempt.attemptId !== input.attemptId) throw new Error('attempt_not_found');
      assertOwner(attempt, input);
      assertWritable(attempt);
      if (attempt.revision !== input.expectedRevision) throw new Error('selection_outdated');
      const updated = await repository.updateIfRevision(input.attemptId, input.expectedRevision, {
        revision: input.expectedRevision + 1,
        selection: input.selection,
      });
      if (!updated) throw new Error('selection_outdated');
      return updated;
    });
  }

  return { getOrCreate, advanceSelection };
}
