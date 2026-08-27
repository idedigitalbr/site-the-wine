import type { Metadata } from 'next';
import { ReservationPortal } from '@/components/reservation/portal/ReservationPortal';
import { getPublicReservation } from '@/server/reservations/portal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Detalhes da reserva | The Wine Experience',
  description: 'Consulte os detalhes da sua reserva no The Wine Experience.',
};

export default async function MyReservationTokenPage({ params }: { params: Promise<{ secureToken: string }> }) {
  const { secureToken } = await params;
  let reservation = null;
  try {
    reservation = await getPublicReservation(secureToken);
  } catch {
    reservation = null;
  }

  return <ReservationPortal initialReservation={reservation} secureToken={secureToken} />;
}
