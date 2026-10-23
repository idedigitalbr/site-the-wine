'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerReservationsResponseSchema } from '@/lib/customer-reservations-schema';
import { customerAuthHref } from '@/lib/customer-auth-destination';
import type { CustomerReservationItem, CustomerReservationsResponse } from '@/types/customer-reservations';

type RequestKind = 'first' | 'more';
type ActiveRequest = { controller: AbortController; generation: number; kind: RequestKind };
type LoadPhase = 'loading' | 'ready' | 'error' | 'redirecting';

const AUTO_REVALIDATE_INTERVAL_MS = 30_000;

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

function latestRevalidationAt(successAt: number | null, attemptAt: number | null): number | null {
  if (successAt === null) return attemptAt;
  if (attemptAt === null) return successAt;
  return Math.max(successAt, attemptAt);
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
  const lastFirstPageSuccessAtRef = useRef<number | null>(null);
  const lastAutomaticAttemptAtRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isRedirectingRef = useRef(false);

  const isStale = useCallback((generation: number) => generationRef.current !== generation, []);

  const handleUnauthorized = useCallback(() => {
    isRedirectingRef.current = true;
    generationRef.current += 1;
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setReservations([]);
    setNextOffset(null);
    setMoreError(false);
    setIsLoadingMore(false);
    setPhase('redirecting');
    router.replace(customerAuthHref('/lista-de-reservas'));
  }, [router]);

  const applyFirstPayload = useCallback((generation: number, payload: CustomerReservationsResponse) => {
    if (isStale(generation)) return;
    if (payload.nextOffset !== null && payload.nextOffset <= 0) throw new Error('Invalid next offset');
    setReservations(payload.reservations);
    setNextOffset(payload.nextOffset);
    setPhase('ready');
    lastFirstPageSuccessAtRef.current = performance.now();
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
    isMountedRef.current = true;
    isRedirectingRef.current = false;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || !isMountedRef.current) return;
      void replaceFirstPage();
    });
    return () => {
      cancelled = true;
      isMountedRef.current = false;
      generationRef.current += 1;
      activeRequestRef.current?.controller.abort();
      activeRequestRef.current = null;
    };
  }, [replaceFirstPage]);

  const revalidateOnVisibility = useCallback(() => {
    if (!isMountedRef.current || isRedirectingRef.current || phase === 'redirecting') return;
    if (document.visibilityState !== 'visible') return;
    if (activeRequestRef.current) return;

    const lastActivityAt = latestRevalidationAt(
      lastFirstPageSuccessAtRef.current,
      lastAutomaticAttemptAtRef.current,
    );
    if (lastActivityAt === null) return;

    const now = performance.now();
    if (now - lastActivityAt < AUTO_REVALIDATE_INTERVAL_MS) return;
    lastAutomaticAttemptAtRef.current = now;
    void replaceFirstPage(true);
  }, [phase, replaceFirstPage]);

  useEffect(() => {
    document.addEventListener('visibilitychange', revalidateOnVisibility);
    return () => {
      document.removeEventListener('visibilitychange', revalidateOnVisibility);
    };
  }, [revalidateOnVisibility]);

  const retry = useCallback(() => {
    void replaceFirstPage(true);
  }, [replaceFirstPage]);

  return {
    reservations,
    nextOffset,
    phase,
    isLoadingMore,
    moreError,
    retry,
    loadMore: appendNextPage,
  };
}
