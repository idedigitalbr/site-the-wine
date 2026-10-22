function parseClock(value: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function calculateCustomerReservationDuration(
  startTime: string,
  endTime: string,
): number | null {
  const start = parseClock(startTime);
  const end = parseClock(endTime);
  if (start === null || end === null || end <= start) return null;
  return end - start;
}
