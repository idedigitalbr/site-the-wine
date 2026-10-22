import type { Metadata } from 'next';
import '../../../public/style.css';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ReservationWizard } from '@/components/reservation/v2/ReservationWizard';

export const metadata: Metadata = {
  title: 'Reserve sua experiência | The Wine Experience',
  description: 'Escolha sua data, horário e reserve sua experiência no The Wine Experience.',
  alternates: {
    canonical: '/reservas',
  },
};

export default function ReservationsPage() {
  return (
    <>
      <Header />
      <ReservationWizard />
      <div data-reservation-checkout-footer><Footer /></div>
      <SiteBehaviorController />
    </>
  );
}
