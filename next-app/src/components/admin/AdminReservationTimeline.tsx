'use client';

import { History, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import type { AdminReservationTimelineEntry } from '@/modules/admin/application/ports';
import { adminActorLabel, formatAdminDateTime, reservationEventLabel } from '@/lib/admin-labels';

type Props = { id: number };

function eventLabel(entry: AdminReservationTimelineEntry): string {
  return reservationEventLabel(entry.eventType, entry.fromStatus, entry.toStatus);
}

export function AdminReservationTimeline({ id }: Props) {
  const [timeline, setTimeline] = useState<AdminReservationTimelineEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const toggle = async () => {
    if (timeline) {
      setTimeline(null);
      return;
    }
    setIsLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/admin/reservations/${id}/timeline`);
      if (!response.ok) throw new Error('timeline_failed');
      const body = await response.json() as { timeline: AdminReservationTimelineEntry[] };
      setTimeline(body.timeline);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button type="button" onClick={toggle} disabled={isLoading} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
        {isLoading ? <LoaderCircle aria-label="Carregando timeline" className="animate-spin" size={13} /> : <History aria-hidden="true" size={13} />}
        {timeline ? 'Ocultar timeline' : 'Ver timeline'}
      </button>
      {error && <p className="mt-1 text-[11px] text-status-danger">Timeline indisponível.</p>}
      {timeline && (
        <ol className="mt-2 space-y-2 border-l border-border pl-3 text-[11px] text-muted">
          {timeline.length === 0 ? <li>Nenhum evento registrado.</li> : timeline.map((entry) => <li key={entry.id}><strong className="block text-foreground">{eventLabel(entry)}</strong><span>{formatAdminDateTime(entry.createdAt)} · {adminActorLabel(entry.actorType, entry.actorLabel)}</span></li>)}
        </ol>
      )}
    </div>
  );
}
