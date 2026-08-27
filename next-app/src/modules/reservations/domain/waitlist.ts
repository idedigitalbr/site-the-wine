export const waitlistStatuses = ['waiting', 'notified', 'converted', 'cancelled', 'expired'] as const;
export type WaitlistStatus = (typeof waitlistStatuses)[number];

const transitions: Record<WaitlistStatus, readonly WaitlistStatus[]> = {
  waiting: ['notified', 'cancelled', 'expired'],
  notified: ['converted', 'cancelled', 'expired'],
  converted: [],
  cancelled: [],
  expired: [],
};

export function isWaitlistStatus(value: string): value is WaitlistStatus {
  return waitlistStatuses.includes(value as WaitlistStatus);
}

export function canTransitionWaitlist(from: WaitlistStatus, to: WaitlistStatus): boolean {
  return from === to || transitions[from].includes(to);
}

export function assertWaitlistTransition(from: WaitlistStatus, to: WaitlistStatus): void {
  if (!canTransitionWaitlist(from, to)) {
    throw new Error(`Invalid waitlist transition: ${from} -> ${to}`);
  }
}
