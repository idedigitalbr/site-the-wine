import { authJson } from '@/server/customer-auth/http';
import { getCustomerSession } from '@/server/customer-auth/service';
import { getReservationCheckoutContext } from '@/server/reservations/reservation-checkout';

export const runtime = 'nodejs';
function parseId(value: string): number | null { return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null; }
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCustomerSession(request);
    if (!session) return authJson({ error: 'unauthorized', message: 'Seu acesso expirou. Entre novamente para continuar.' }, 401);
    const id = parseId((await context.params).id);
    if (!id) return authJson({ error: 'invalid_id', message: 'Reserva inválida.' }, 400);
    const result = await getReservationCheckoutContext(id, session.user.id);
    if (!result) return authJson({ error: 'reservation_not_found', message: 'Não encontramos essa reserva.' }, 404);
    return authJson(result, 200);
  } catch (error) {
    if (error instanceof Error && error.message === 'reservation_not_payable') return authJson({ error: 'reservation_not_payable', message: 'Esta reserva não pode receber pagamento.' }, 409);
    console.error('Reservation checkout context unavailable');
    return authJson({ error: 'checkout_unavailable', message: 'Não foi possível carregar os detalhes da reserva.' }, 503);
  }
}
