import type { Metadata } from 'next';
import { ReservationWizard } from '@/components/reservation/v2/ReservationWizard';

export const metadata: Metadata = {
  title: 'Reserve sua experiência | The Wine Experience',
  description: 'Escolha sua data, horário e reserve sua experiência no The Wine Experience.',
};

export default function ReservationsPage() {
  return <ReservationWizard />;
}
