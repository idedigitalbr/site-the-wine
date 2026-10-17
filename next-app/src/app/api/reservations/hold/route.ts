import { NextResponse } from 'next/server';
import { createReservationSessionToken, getReservationSessionToken, hashReservationSessionToken, attachReservationSession } from '@/server/reservations/session';
import { submitReservationHold } from '@/server/reservations/create-public-reservation';
import { reservationHoldRequestSchema } from '@/modules/reservations/schemas/public-reservation-schema';
import { submitAutomaticReservationHold } from '@/server/reservations/create-public-reservation';
import { authJson, readJsonBody } from '@/server/customer-auth/http';
import { hasTrustedOrigin } from '@/server/customer-auth/origin';
import { getCustomerSession } from '@/server/customer-auth/service';
import { ensureCustomerForAuthUser } from '@/server/customer-auth/repository';

function classifyHoldError(error: unknown): { code: string; status: number } {
  const message = error instanceof Error ? error.message : '';
  if (message.startsWith('Reservation unavailable')) return { code: 'hold_unavailable', status: 409 };
  if (message.startsWith('Invalid')) return { code: 'invalid_input', status: 400 };
  if (['selection_outdated', 'attempt_owner_mismatch', 'attempt_expired', 'attempt_confirmed', 'attempt_invalidated'].includes(message)) return { code: message, status: 409 };
  if (message === 'session_expired') return { code: 'session_expired', status: 401 };
  return { code: 'hold_unavailable', status: 503 };
}

function errorResponse(error: unknown): NextResponse {
  const classified = classifyHoldError(error);
  if (classified.status === 503) console.error('Reservation hold creation failed', error);
  return NextResponse.json({ error: classified.code }, { status: classified.status });
}

function parseHoldRequest(body: unknown) {
  const rawBody = body as Record<string, unknown>;
  return reservationHoldRequestSchema.safeParse({ ...rawBody, allocationMode: rawBody.allocationMode ?? 'legacy' });
}

async function createAutomaticHold(request: Request, data: Extract<Awaited<ReturnType<typeof parseHoldRequest>>, { success: true }>['data'], sessionTokenHash: string) {
  if (data.allocationMode !== 'automatic') return null;
  const session = await getCustomerSession(request);
  if (!session) throw new Error('session_expired');
  const customer = await ensureCustomerForAuthUser(session.user.id);
  return submitAutomaticReservationHold(data, { userId: session.user.id, customerId: customer.id }, sessionTokenHash);
}

async function createHold(request: Request, data: Extract<Awaited<ReturnType<typeof parseHoldRequest>>, { success: true }>['data'], sessionTokenHash: string) {
  const automatic = await createAutomaticHold(request, data, sessionTokenHash);
  if (automatic) return automatic;
  if (data.allocationMode !== 'legacy') throw new Error('Invalid reservation hold mode');
  return submitReservationHold(data, sessionTokenHash);
}

async function prepareHoldRequest(request: Request) {
  if (!hasTrustedOrigin(request)) return { response: authJson({ error: 'untrusted_origin' }, 403) } as const;
  const body = await readJsonBody(request);
  if (!body) return { response: authJson({ error: 'invalid_json' }, 400) } as const;
  const parsed = parseHoldRequest(body);
  if (!parsed.success) return { response: NextResponse.json({ error: 'invalid_input' }, { status: 400 }) } as const;
  const existingToken = await getReservationSessionToken();
  if (parsed.data.allocationMode === 'automatic' && !existingToken) return { response: NextResponse.json({ error: 'hold_required' }, { status: 409 }) } as const;
  const sessionToken = existingToken ?? createReservationSessionToken();
  return { data: parsed.data, existingToken, sessionToken } as const;
}

export async function POST(request: Request) {
  const prepared = await prepareHoldRequest(request);
  if ('response' in prepared) return prepared.response;
  try {
    const sessionTokenHash = hashReservationSessionToken(prepared.sessionToken);
    const result = await createHold(request, prepared.data, sessionTokenHash);
    const response = NextResponse.json(result, { status: 201 });
    return prepared.existingToken ? response : attachReservationSession(response, prepared.sessionToken);
  } catch (error) {
    return errorResponse(error);
  }
}
