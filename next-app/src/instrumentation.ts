export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NODE_ENV !== 'production') return;

  const { startReservationReplayCleanup } = await import('./server/reservations/replay-retention');
  startReservationReplayCleanup();
}
