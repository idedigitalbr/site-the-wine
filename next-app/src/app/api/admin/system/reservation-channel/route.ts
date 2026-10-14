import { NextResponse } from 'next/server';
import { savePublicReservationEnabledSchema, saveReservationWhatsappNumberSchema } from '@/modules/system/schemas/system-schema';
import { setPublicReservationEnabled, setPublicReservationWhatsappNumber } from '@/server/system/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json();
    const enabled = savePublicReservationEnabledSchema.safeParse(body);
    if (enabled.success) {
      await setPublicReservationEnabled(enabled.data.enabled);
      return NextResponse.json({ ok: true, publicReservationEnabled: enabled.data.enabled });
    }

    const whatsapp = saveReservationWhatsappNumberSchema.safeParse(body);
    if (!whatsapp.success) {
      return NextResponse.json({ error: 'invalid_input', fields: whatsapp.error.issues.map((issue) => issue.path.join('.')) }, { status: 400 });
    }
    await setPublicReservationWhatsappNumber(whatsapp.data.reservationWhatsappNumber);
    return NextResponse.json({ ok: true, reservationWhatsappNumber: whatsapp.data.reservationWhatsappNumber });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    console.error('Admin reservation channel save failed', error);
    return NextResponse.json({ error: 'system_unavailable' }, { status: 503 });
  }
}
