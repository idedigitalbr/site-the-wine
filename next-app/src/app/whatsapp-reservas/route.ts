import { NextRequest, NextResponse } from 'next/server';
import { getPublicReservationSettings } from '@/server/system/composition';
import { buildReservationWhatsappUrl } from '@/server/system/reservation-whatsapp';

export async function GET(request: NextRequest) {
  try {
    const settings = await getPublicReservationSettings();
    return NextResponse.redirect(buildReservationWhatsappUrl(settings.reservationWhatsappNumber), {
      status: 307,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Reservation WhatsApp redirect failed', error);
    return NextResponse.json({ error: 'reservation_unavailable' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
