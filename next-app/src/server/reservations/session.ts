import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const reservationSessionCookie = 'thewine_reservation_session';
const reservationSessionMaxAge = 30 * 60;

export function createReservationSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashReservationSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function getReservationSessionToken(): Promise<string | null> {
  return (await cookies()).get(reservationSessionCookie)?.value ?? null;
}

export async function getReservationSessionTokenHash(): Promise<string | null> {
  const token = await getReservationSessionToken();
  return token ? hashReservationSessionToken(token) : null;
}

export function attachReservationSession(response: NextResponse, token: string): NextResponse {
  response.cookies.set(reservationSessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: reservationSessionMaxAge,
  });
  return response;
}
