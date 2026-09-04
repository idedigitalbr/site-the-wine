import { redirect } from 'next/navigation';
import { whatsappLinks } from '@/config/social';

export default function ReservationsPage() {
  redirect(whatsappLinks.reservation);
}
