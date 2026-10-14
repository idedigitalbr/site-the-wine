export function isValidBirthDate(value: string, today: string): boolean {
  const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = datePattern.exec(value);
  const todayMatch = datePattern.exec(today);
  if (!match || !todayMatch) return false;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return false;
  }

  return value <= today;
}
