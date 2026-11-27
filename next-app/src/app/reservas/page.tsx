import type { Metadata } from 'next';
import '../../../public/style.css';
import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ReservationWizard } from '@/components/reservation/v2/ReservationWizard';
import { ReservationCheckout } from '@/components/reservation/v2/ReservationCheckout';

export const metadata: Metadata = {
  title: 'Reserve sua experiência | The Wine Experience',
  description: 'Escolha sua data, horário e reserve sua experiência no The Wine Experience.',
  alternates: {
    canonical: '/reservas',
  },
};

function parseCheckoutReservationId(value: string | string[] | undefined): number | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^\d+$/.test(candidate) && Number.isSafeInteger(Number(candidate)) && Number(candidate) > 0 ? Number(candidate) : null;
}

export default async function ReservationsPage({ searchParams }: { searchParams?: Promise<{ checkoutReservationId?: string | string[] }> }) {
  const query = searchParams ? await searchParams : {};
  const checkoutReservationId = parseCheckoutReservationId(query.checkoutReservationId);
  return (
    <>
      <Header />
      {checkoutReservationId ? <ReservationCheckout reservationId={checkoutReservationId} publicCode="" /> : <ReservationWizard />}
      <div data-reservation-checkout-footer><Footer /></div>
      <SiteBehaviorController />
    </>
  );
}
