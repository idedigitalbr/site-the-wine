export type ReservationHttpError = {
  code: string;
  status: number;
};

const conflictErrors = new Set([
  'idempotency_conflict',
  'reservation_confirmation_in_progress',
  'selection_outdated',
  'attempt_owner_mismatch',
  'attempt_expired',
  'attempt_confirmed',
  'attempt_invalidated',
]);

export function classifyReservationError(error: unknown): ReservationHttpError {
  const message = error instanceof Error ? error.message : '';

  if (message === 'reservation_replay_expired') return { code: message, status: 410 };
  if (message.startsWith('Reservation unavailable')) return { code: 'reservation_unavailable', status: 409 };
  if (message.startsWith('Invalid')) return { code: 'invalid_input', status: 400 };
  if (conflictErrors.has(message)) {
    return {
      code: message === 'reservation_confirmation_in_progress' ? 'confirmation_in_progress' : message,
      status: 409,
    };
  }

  return { code: 'reservation_service_unavailable', status: 503 };
}
