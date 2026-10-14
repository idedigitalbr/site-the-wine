import 'server-only';
import { NextResponse } from 'next/server';
import { CustomerAuthError } from './errors';

export async function readJsonBody(request: Request): Promise<unknown | null> {
  const maxBytes = 16 * 1024;
  const contentLength = request.headers.get('content-length');
  if (contentLength !== null && Number(contentLength) > maxBytes) return null;
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export function authJson(body: unknown, status = 200, headers?: HeadersInit): NextResponse {
  const response = NextResponse.json(body, { status, headers });
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export function addAuthCookies(response: NextResponse, source: Headers): NextResponse {
  const authHeaders = source as Headers & { getSetCookie?: () => string[] };
  const cookies = authHeaders.getSetCookie?.() ?? [source.get('set-cookie')].filter((value): value is string => Boolean(value));
  for (const cookie of cookies) response.headers.append('Set-Cookie', cookie);
  return response;
}

export function customerAuthErrorResponse(error: unknown): NextResponse {
  if (error instanceof CustomerAuthError) {
    const headers = new Headers();
    if (error.code.startsWith('RATE_LIMIT:')) headers.set('Retry-After', error.code.slice('RATE_LIMIT:'.length));
    return authJson({ error: error.code.startsWith('RATE_LIMIT:') ? 'rate_limited' : error.code, message: error.message }, error.status, headers);
  }
  return authJson({ error: 'service_unavailable', message: 'Não foi possível concluir agora. Tente novamente em instantes.' }, 503);
}
