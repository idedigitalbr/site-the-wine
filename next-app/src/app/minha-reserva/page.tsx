import type { Metadata } from 'next';
import { ReservationPortal } from '@/components/reservation/portal/ReservationPortal';

export const metadata: Metadata = {
  title: 'Minha reserva | The Wine Experience',
  description: 'Acesse os detalhes da sua reserva no The Wine Experience.',
};

export default function MyReservationPage() {
  return <ReservationPortal initialReservation={null} secureToken={null} />;
}
