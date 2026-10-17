import { createHash } from 'node:crypto';

export type ConfirmationContent = {
  date: string;
  time: string;
  guests: number;
  duration: number;
  tableIds: number[];
  specialNeeds: string[];
  notes: string;
};

export type ConfirmationOperationRecord = {
  status: 'pending' | 'completed' | 'conflict' | 'failed';
  contentFingerprint: string;
};

export function canonicalReservationFingerprint(input: ConfirmationContent): string {
  const canonical = JSON.stringify({
    date: input.date,
    time: input.time,
    guests: input.guests,
    duration: input.duration,
    tableIds: [...input.tableIds].sort((a, b) => a - b),
    specialNeeds: [...input.specialNeeds].sort(),
    notes: input.notes.trim(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export function classifyConfirmationOperation(
  existing: ConfirmationOperationRecord | null,
  contentFingerprint: string,
): 'new' | 'replay' | 'idempotency_conflict' {
  if (!existing) return 'new';
  if (existing.contentFingerprint !== contentFingerprint) return 'idempotency_conflict';
  return 'replay';
}
