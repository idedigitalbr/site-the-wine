import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const sessionCookieName = 'thewine_admin_session';
const sessionDurationMs = 8 * 60 * 60 * 1000;

export type AdminRole = 'manager';

export type AdminSession = {
  email: string;
  role: AdminRole;
  expiresAt: number;
};

export class AdminAuthError extends Error {
  constructor(message = 'Admin authentication required') {
    super(message);
    this.name = 'AdminAuthError';
  }
}

function configuredValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function sessionSigningKey(): string | null {
  return configuredValue('ADMIN_SESSION_SECRET');
}

export function isAdminConfigured(): boolean {
  return Boolean(
    configuredValue('ADMIN_EMAIL')
    && configuredValue('ADMIN_PASSWORD')
    && sessionSigningKey(),
  );
}

function signature(payload: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(payload).digest('base64url');
}

function encodeSession(session: AdminSession, signingKey: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${signature(payload, signingKey)}`;
}

function safeEqual(first: string, second: string): boolean {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length
    && timingSafeEqual(firstBuffer, secondBuffer);
}

function decodeSession(value: string, signingKey: string): AdminSession | null {
  const [payload, suppliedSignature] = value.split('.');
  if (!payload || !suppliedSignature || !safeEqual(signature(payload, signingKey), suppliedSignature)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<AdminSession>;
    if (session.role !== 'manager' || !session.email || !session.expiresAt) return null;
    if (session.expiresAt <= Date.now()) return null;
    return {
      email: session.email,
      role: session.role,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}

function valuesMatch(expected: string, supplied: string): boolean {
  return safeEqual(expected, supplied);
}

export function credentialsAreValid(email: string, password: string): boolean {
  const configuredEmail = configuredValue('ADMIN_EMAIL');
  const configuredCredential = configuredValue('ADMIN_PASSWORD');
  return Boolean(
    configuredEmail
    && configuredCredential
    && valuesMatch(configuredEmail, email.trim())
    && valuesMatch(configuredCredential, password),
  );
}

export function attachAdminSession(response: NextResponse, email: string): NextResponse {
  const signingKey = sessionSigningKey();
  if (!signingKey) throw new AdminAuthError('Admin authentication is not configured');

  const session: AdminSession = {
    email,
    role: 'manager',
    expiresAt: Date.now() + sessionDurationMs,
  };
  response.cookies.set(sessionCookieName, encodeSession(session, signingKey), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionDurationMs / 1000,
  });
  return response;
}

export function clearAdminSession(response: NextResponse): NextResponse {
  response.cookies.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const signingKey = sessionSigningKey();
  if (!signingKey) return null;
  const cookie = (await cookies()).get(sessionCookieName);
  return cookie ? decodeSession(cookie.value, signingKey) : null;
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError();
  return session;
}
