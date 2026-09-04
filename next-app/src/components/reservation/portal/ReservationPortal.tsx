'use client';

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Search,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { whatsappLinks } from '@/config/social';
import type { PortalReservation } from '@/modules/reservations/application/ports';

type CancellationState = 'idle' | 'confirming' | 'submitting' | 'success' | 'error';

const statusLabels: Record<PortalReservation['status'], string> = {
  draft: 'Rascunho',
  hold: 'Mesa reservada temporariamente',
  payment_pending: 'Aguardando pagamento',
  pending: 'Aguardando confirmação',
  confirmed: 'Confirmada',
  seated: 'Em atendimento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  no_show: 'Não compareceu',
  expired: 'Expirada',
};

function formatDate(date: string): string {
  return date.split('-').reverse().join('/');
}

function canCancel(status: PortalReservation['status']): boolean {
  return ['hold', 'payment_pending', 'pending', 'confirmed'].includes(status);
}

function PortalHeader() {
  return (
    <header className="border-b border-border bg-surface/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm tracking-[0.18em] text-primary">
          <span className="font-display text-2xl tracking-normal">THE WINE</span>
          <span className="hidden text-[10px] uppercase text-muted sm:inline">Experience</span>
        </Link>
        <a href={whatsappLinks.reservation} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted transition hover:text-primary">
          <ArrowLeft aria-hidden="true" size={15} /> Nova reserva
        </a>
      </div>
    </header>
  );
}

function ReservationCodeLookup({ onFound }: { onFound: (reservation: PortalReservation) => void }) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const publicCode = code.replace(/\s/g, '').toUpperCase();
    if (publicCode.length < 6 || publicCode.length > 24 || !/^[A-Z0-9]+-[A-Z0-9]+$/.test(publicCode)) {
      setMessage('Digite um código de reserva válido, como TW-8EBBC196114EC2F4.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/reservations/portal/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicCode }),
      });
      if (response.status === 404) {
        setMessage('Não encontramos uma reserva com esse código. Confira os caracteres e tente novamente.');
        return;
      }
      if (!response.ok) {
        setMessage('Não foi possível consultar agora. Tente novamente em instantes.');
        return;
      }
      const result = await response.json() as { reservation: PortalReservation };
      onFound(result.reservation);
    } catch {
      setMessage('Não foi possível consultar agora. Tente novamente em instantes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-7 max-w-md text-left" aria-label="Consultar reserva pelo código">
      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary"><Search aria-hidden="true" size={15} /> Código da reserva</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className="reservation-input"
          placeholder="TW-8EBBC196114EC2F4"
          autoComplete="off"
          maxLength={24}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? 'reservation-code-error' : undefined}
        />
      </label>
      {message && <p id="reservation-code-error" role="alert" className="mt-2 text-sm text-status-danger">{message}</p>}
      <button type="submit" disabled={isSubmitting} className="reservation-primary-button mt-4 w-full disabled:cursor-wait disabled:opacity-70">
        {isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Search aria-hidden="true" size={16} />}
        {isSubmitting ? 'Consultando...' : 'Consultar minha reserva'}
      </button>
    </form>
  );
}

function PortalIntro({ invalidToken, onFound }: { invalidToken: boolean; onFound: (reservation: PortalReservation) => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
        {invalidToken ? <CircleAlert aria-hidden="true" size={27} /> : <LockKeyhole aria-hidden="true" size={27} />}
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Minha reserva</p>
      <h1 className="mt-3 font-display text-4xl text-foreground">
        {invalidToken ? 'Link indisponível' : 'Acesse sua reserva'}
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
        {invalidToken
          ? 'Não encontramos uma reserva para este link. Confira o endereço recebido ou faça uma nova reserva.'
          : 'O acesso é feito pelo link privado exibido na confirmação da sua reserva. Não é necessário criar uma conta.'}
      </p>
      {!invalidToken && <p className="mt-3 text-xs text-muted">Você também pode informar o código da reserva recebido na confirmação.</p>}
      <ReservationCodeLookup onFound={onFound} />
      <a href={whatsappLinks.reservation} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover">
        Fazer uma reserva <ArrowRight aria-hidden="true" size={16} />
      </a>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted p-4">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted"><Icon aria-hidden="true" className="text-primary" size={16} /> {label}</dt>
      <dd className="mt-2 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function ReservationDetails({ reservation }: { reservation: PortalReservation }) {
  return (
    <dl className="mt-7 grid gap-3 sm:grid-cols-2">
      <Detail icon={CalendarDays} label="Data" value={formatDate(reservation.reservationDate)} />
      <Detail icon={Clock3} label="Horário" value={`${reservation.startTime} até ${reservation.endTime}`} />
      <Detail icon={UsersRound} label="Pessoas" value={`${reservation.guestCount} ${reservation.guestCount === 1 ? 'pessoa' : 'pessoas'}`} />
      <Detail icon={MapPin} label="Mesa" value={reservation.tableLabel ?? 'A definir pela equipe'} />
    </dl>
  );
}

function CancellationAction({
  state,
  message,
  onConfirm,
  onStart,
  onCancel,
}: {
  state: CancellationState;
  message: string;
  onConfirm: () => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  if (state === 'success') {
    return <p role="status" className="mt-5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-status-success/30 bg-status-success/10 p-3 text-sm text-status-success"><Check aria-hidden="true" size={17} /> Cancelamento realizado.</p>;
  }

  if (state === 'confirming' || state === 'submitting') {
    return (
      <div className="mt-5 rounded-[var(--radius-sm)] border border-status-warning/30 bg-status-warning/10 p-4 text-sm text-foreground">
        <p className="font-semibold">Deseja cancelar esta reserva?</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">Essa ação não poderá ser desfeita por este portal.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onConfirm} disabled={state === 'submitting'} className="reservation-primary-button disabled:cursor-wait disabled:opacity-70">
            {state === 'submitting' ? 'Cancelando...' : 'Confirmar cancelamento'}
          </button>
          <button type="button" onClick={onCancel} disabled={state === 'submitting'} className="reservation-secondary-button disabled:opacity-60">Manter reserva</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {state === 'error' && <p role="alert" className="mb-3 text-sm text-status-danger">{message}</p>}
      <button type="button" onClick={onStart} className="reservation-secondary-button">Cancelar reserva</button>
    </div>
  );
}

function ReservationCard({ reservation, secureToken }: { reservation: PortalReservation; secureToken: string | null }) {
  const [currentReservation, setCurrentReservation] = useState(reservation);
  const [cancellationState, setCancellationState] = useState<CancellationState>('idle');
  const [message, setMessage] = useState('');

  const cancel = async () => {
    setCancellationState('submitting');
    setMessage('');
    try {
      const response = await fetch('/api/reservations/portal/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secureToken }),
      });
      if (!response.ok) {
        setMessage(response.status === 409
          ? 'Esta reserva já não pode ser cancelada por aqui. Fale com nossa equipe.'
          : 'Não foi possível cancelar agora. Tente novamente em instantes.');
        setCancellationState('error');
        return;
      }
      const result = await response.json() as { reservation: PortalReservation };
      setCurrentReservation(result.reservation);
      setCancellationState('success');
    } catch {
      setMessage('Não foi possível cancelar agora. Tente novamente em instantes.');
      setCancellationState('error');
    }
  };

  return (
    <article className="mx-auto max-w-2xl rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-sm sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Minha reserva</p>
          <h1 className="mt-3 font-display text-4xl text-foreground">Olá, {currentReservation.customerName}.</h1>
          <p className="mt-2 text-sm text-muted">Código {currentReservation.publicCode}</p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{statusLabels[currentReservation.status]}</span>
      </div>

      <ReservationDetails reservation={currentReservation} />

      <div className="mt-5 flex items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-muted p-4">
        <CreditCard aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18} />
        <div><p className="text-sm font-semibold text-foreground">Pagamento</p><p className="mt-1 text-xs leading-relaxed text-muted">Gateway ainda não definido. Nenhuma cobrança real está vinculada a esta reserva.</p></div>
      </div>

      {secureToken && canCancel(currentReservation.status) && cancellationState !== 'success' && <CancellationAction state={cancellationState} message={message} onConfirm={cancel} onStart={() => setCancellationState('confirming')} onCancel={() => setCancellationState('idle')} />}
      {!secureToken && <p className="mt-5 text-xs leading-relaxed text-muted">Para cancelar ou alterar a reserva, use o link privado recebido na confirmação.</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <a href={whatsappLinks.reservation} target="_blank" rel="noopener noreferrer" className="reservation-primary-button">Nova reserva <ArrowRight aria-hidden="true" size={16} /></a>
        <a href="https://wa.me/5591984040710" target="_blank" rel="noreferrer" className="reservation-secondary-button">Falar com a equipe <ExternalLink aria-hidden="true" size={15} /></a>
      </div>
    </article>
  );
}

export function ReservationPortal({ initialReservation, secureToken }: { initialReservation: PortalReservation | null; secureToken: string | null }) {
  const [lookupReservation, setLookupReservation] = useState<PortalReservation | null>(null);
  const invalidToken = Boolean(secureToken && !initialReservation);

  return (
    <main className="reservation-theme min-h-screen bg-background font-sans text-foreground">
      <PortalHeader />
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        {initialReservation && secureToken
          ? <ReservationCard reservation={initialReservation} secureToken={secureToken} />
          : lookupReservation
            ? <ReservationCard reservation={lookupReservation} secureToken={null} />
            : <PortalIntro invalidToken={invalidToken} onFound={setLookupReservation} />}
      </section>
    </main>
  );
}
