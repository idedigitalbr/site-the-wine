import type { Cleanup } from './types';

export function setupBookingModal(): Cleanup {
  const bookingModal = document.getElementById('bookingModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const triggers = Array.from(document.querySelectorAll<HTMLElement>('.trigger-modal'));

  if (!bookingModal) return () => {};

  const open = (event: Event) => {
    event.preventDefault();
    bookingModal.classList.add('active');
  };

  const close = () => bookingModal.classList.remove('active');

  const handleOverlay = (event: MouseEvent) => {
    if (event.target === bookingModal) close();
  };

  triggers.forEach((trigger) => trigger.addEventListener('click', open));
  modalCloseBtn?.addEventListener('click', close);
  bookingModal.addEventListener('click', handleOverlay);

  return () => {
    triggers.forEach((trigger) => trigger.removeEventListener('click', open));
    modalCloseBtn?.removeEventListener('click', close);
    bookingModal.removeEventListener('click', handleOverlay);
    bookingModal.classList.remove('active');
  };
}
