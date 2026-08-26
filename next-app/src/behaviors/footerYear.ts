import type { Cleanup } from './types';

export function setupFooterYear(): Cleanup {
  const currentYear = document.getElementById('currentYear');
  if (!currentYear) return () => {};

  const previous = currentYear.textContent;
  currentYear.textContent = String(new Date().getFullYear());

  return () => {
    currentYear.textContent = previous;
  };
}
