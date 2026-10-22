'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerReservationsResponseSchema } from '@/lib/customer-reservations-schema';
import type { CustomerReservationItem, CustomerReservationsResponse } from '@/types/customer-reservations';

type RequestKind = 'first' | 'more';
type ActiveRequest = { controller: AbortController; generation: number; kind: RequestKind };
type LoadPhase = 'loading' | 'ready' | 'error' | 'redirecting';

class UnauthorizedError extends Error {}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function clearRequestIfCurrent(
  requestRef: { current: ActiveRequest | null },
  generation: number,
): void {
  if (requestRef.current?.generation === generation) requestRef.current = null;
}

async function classifyResponse(response: Response): Promise<CustomerReservationsResponse> {
  if (response.status === 401) throw new UnauthorizedError();
  if (!response.ok) throw new Error('Request failed');
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Invalid JSON');
  }
  const parsed = customerReservationsResponseSchema.safeParse(body);
  if (!parsed.success) throw new Error('Invalid response');
  return parsed.data;
}

async function fetchPage(offset: number, signal: AbortSignal): Promise<CustomerReservationsResponse> {
  const response = await fetch(`/api/reservations/my?offset=${offset}`, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    signal,
  });
  return classifyResponse(response);
}

function deduplicateReservations(
  current: CustomerReservationItem[],
  incoming: CustomerReservationItem[],
): CustomerReservationItem[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
}

export function useCustomerReservations() {
  const router = useRouter();
  const [reservations, setReservations] = useState<CustomerReservationItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const generationRef = useRef(0);
  const activeRequestRef = useRef<ActiveRequest | null>(null);

  const isStale = useCallback((generation: number) => generationRef.current !== generation, []);

  const handleUnauthorized = useCallback(() => {
    generationRef.current += 1;
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setReservations([]);
    setNextOffset(null);
    setMoreError(false);
    setIsLoadingMore(false);
    setPhase('redirecting');
    router.replace('/reservas');
  }, [router]);

  const applyFirstPayload = useCallback((generation: number, payload: CustomerReservationsResponse) => {
    if (isStale(generation)) return;
    if (payload.nextOffset !== null && payload.nextOffset <= 0) throw new Error('Invalid next offset');
    setReservations(payload.reservations);
    setNextOffset(payload.nextOffset);
    setPhase('ready');
  }, [isStale]);

  const handleFirstError = useCallback((generation: number, error: unknown) => {
    if (isStale(generation) || isAbortError(error)) return;
    if (error instanceof UnauthorizedError) handleUnauthorized();
    else setPhase('error');
  }, [handleUnauthorized, isStale]);

  const applyMorePayload = useCallback((generation: number, offset: number, payload: CustomerReservationsResponse) => {
    if (isStale(generation)) return;
    if (payload.nextOffset !== null && payload.nextOffset <= offset) throw new Error('Invalid next offset');
    setReservations((current) => deduplicateReservations(current, payload.reservations));
    setNextOffset(payload.nextOffset);
  }, [isStale]);

  const handleMoreError = useCallback((generation: number, error: unknown) => {
    if (isStale(generation) || isAbortError(error)) return;
    if (error instanceof UnauthorizedError) handleUnauthorized();
    else setMoreError(true);
  }, [handleUnauthorized, isStale]);

  const replaceFirstPage = useCallback(async (coalesce = false) => {
    if (coalesce && activeRequestRef.current?.kind === 'first') return;
    activeRequestRef.current?.controller.abort();
    const controller = new AbortController();
    const generation = ++generationRef.current;
    activeRequestRef.current = { controller, generation, kind: 'first' };
    setReservations([]);
    setNextOffset(null);
    setMoreError(false);
    setIsLoadingMore(false);
    setPhase('loading');
    try {
      const payload = await fetchPage(0, controller.signal);
      applyFirstPayload(generation, payload);
    } catch (error) {
      handleFirstError(generation, error);
    } finally {
      clearRequestIfCurrent(activeRequestRef, generation);
    }
  }, [applyFirstPayload, handleFirstError]);

  const appendNextPage = useCallback(async () => {
    const offset = nextOffset;
    if (offset === null || activeRequestRef.current) return;
    const controller = new AbortController();
    const generation = generationRef.current;
    activeRequestRef.current = { controller, generation, kind: 'more' };
    setIsLoadingMore(true);
    setMoreError(false);
    try {
      const payload = await fetchPage(offset, controller.signal);
      applyMorePayload(generation, offset, payload);
    } catch (error) {
      handleMoreError(generation, error);
    } finally {
      clearRequestIfCurrent(activeRequestRef, generation);
      if (generationRef.current === generation) setIsLoadingMore(false);
    }
  }, [applyMorePayload, handleMoreError, nextOffset]);

  useEffect(() => {
    queueMicrotask(() => void replaceFirstPage());
    return () => {
      generationRef.current += 1;
      activeRequestRef.current?.controller.abort();
      activeRequestRef.current = null;
    };
  }, [replaceFirstPage]);

  useEffect(() => {
    const revalidate = () => void replaceFirstPage(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') revalidate();
    };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [replaceFirstPage]);

  return {
    reservations,
    nextOffset,
    phase,
    isLoadingMore,
    moreError,
    retry: replaceFirstPage,
    loadMore: appendNextPage,
  };
}
