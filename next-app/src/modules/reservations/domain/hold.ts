import { assertValidAvailabilityQuery, type AvailabilityQuery } from './availability';

export const reservationHoldDurationMinutes = 8;

export type ReservationHoldSelection = AvailabilityQuery & {
  endTime: string;
  tableIds: number[];
  sessionTokenHash: string;
};

export function assertValidReservationHoldSelection(input: ReservationHoldSelection): void {
  assertValidAvailabilityQuery(input);
  if (input.tableIds.length === 0 || input.tableIds.length > 8) {
    throw new Error('Invalid reservation hold: table selection is required');
  }
  if (new Set(input.tableIds).size !== input.tableIds.length) {
    throw new Error('Invalid reservation hold: duplicate tables');
  }
  if (!input.sessionTokenHash.trim()) {
    throw new Error('Invalid reservation hold: session is required');
  }
}
