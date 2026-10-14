import { whatsappLinks } from '@/config/social';

export function buildReservationWhatsappUrl(number: string): string {
  const url = new URL(whatsappLinks.reservation);
  url.searchParams.set('phone', number);
  return url.toString();
}
