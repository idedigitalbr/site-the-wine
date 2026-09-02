import type { Metadata } from 'next';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ReservationWizard } from '@/components/reservation/v2/ReservationWizard';

export const metadata: Metadata = {
  title: 'Reserve sua experiência | The Wine Experience',
  description: 'Escolha sua data, horário e reserve sua experiência no The Wine Experience.',
};

export default function ReservationsPage() {
  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      <Header />
      <ReservationWizard />
      <Footer />
      <SiteBehaviorController />
    </>
  );
}
