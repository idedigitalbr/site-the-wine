'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch, type FieldErrors, type FieldPath, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import { whatsappLinks } from '@/config/social';
import { ReservationCheckout } from './ReservationCheckout';
import { customerAuthHref } from '@/lib/customer-auth-destination';
import { MockPaymentDemo } from './MockPaymentDemo';
import { WaitlistForm } from './WaitlistForm';
import { authenticatedPublicReservationSchema, type AuthenticatedPublicReservationInput } from '@/modules/reservations/schemas/public-reservation-schema';
import { ReservationAccessGate } from './ReservationAccessGate';
import { ReservationPreferencesStep } from './ReservationPreferencesStep';
import { StepDateAndTime } from './StepDateAndTime';
import { StepGuests } from './StepGuests';
import { ReservationReview } from './ReservationReview';
import { useReservationWizardStore, type ReservationCheckpoint } from './useReservationWizardStore';

type AvailabilityOption = {
  tableIds: number[];
  combinationId: number | null;
  capacityMin: number;
  capacityMax: number;
};

type AvailabilitySlot = {
  startTime: string;
  endTime: string;
  availableTableCount: number;
  eligibleGuestCounts: number[];
  options: AvailabilityOption[];
};

type AvailabilityResponse = {
  slots: AvailabilitySlot[];
};

type CreatedReservation = {
  reservationId: number;
  publicCode: string;
  secureToken: string;
  status: string;
};

type CreatedReservationHold = {
  holdId: number;
  tableIds: number[];
  expiresAt: number;
};

type FormValues = AuthenticatedPublicReservationInput;

type ReservationUser = { id: string; name: string };

type CancelableDelay = {
  promise: Promise<void>;
  cancel: () => void;
};

function createCancelableDelay(milliseconds: number): CancelableDelay {
  let timer: number | null = null;
  let resolveDelay: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    resolveDelay = resolve;
    timer = window.setTimeout(() => {
      timer = null;
      resolveDelay = null;
      resolve();
    }, milliseconds);
  });

  return {
    promise,
    cancel: () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      resolveDelay?.();
      resolveDelay = null;
    },
  };
}
type SessionResponse = { status?: string; user?: ReservationUser };
type ApiErrorResponse = { error?: string; message?: string; parseFailed?: boolean };

const steps = ['Seus dados', 'Data', 'Pessoas', 'Preferências', 'Confirmação'];
const defaultReservationValues: FormValues = {
  flowId: '',
  allocationMode: 'legacy',
  date: '',
  time: '',
  guests: 0,
  duration: 120,
  tableIds: [],
  specialNeeds: [],
  notes: '',
};

function reservationContentKey(input: Pick<FormValues, 'date' | 'time' | 'guests' | 'duration' | 'tableIds' | 'specialNeeds' | 'notes'>): string {
  return JSON.stringify({
    date: input.date,
    time: input.time,
    guests: input.guests,
    duration: input.duration,
    tableIds: [...input.tableIds].sort((a, b) => a - b),
    specialNeeds: [...input.specialNeeds].sort(),
    notes: input.notes.trim(),
  });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatHoldExpiry(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

async function fetchAvailability(
  date: string,
  duration: number,
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({ mode: 'general', date, duration: String(duration) });
  const response = await fetch(`/api/reservations/availability?${params}`);
  if (!response.ok) throw new Error('availability_unavailable');
  return response.json();
}

type SessionFlowResult =
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; user: ReservationUser; flowId: string; attemptId: string; revision: number }
  | { kind: 'error'; error: string; message: string };

type FlowCreationResult = { kind: 'created'; flowId: string; attemptId: string; revision: number } | { kind: 'error'; error: string; message: string };
type CheckpointResult = { kind: 'valid'; flowId: string; attemptId?: string; revision?: number } | { kind: 'session-lost'; reason: 'expired' | 'changed' } | { kind: 'error'; message: string };
type ReservationSubmitResult =
  | { kind: 'created'; reservation: CreatedReservation }
  | { kind: 'flow-renewed'; flowId: string; attemptId: string; revision: number }
  | { kind: 'session-lost'; reason: 'expired' | 'changed' }
  | { kind: 'error'; error: string; message: string; status: number };

function sessionLossReason(error: string): 'expired' | 'changed' | null {
  if (error === 'session_expired') return 'expired';
  if (error === 'account_changed') return 'changed';
  return null;
}

async function readApiError(response: Response): Promise<ApiErrorResponse> {
  return response.json().catch(() => ({ parseFailed: true })) as Promise<ApiErrorResponse>;
}

async function createReservationFlow(): Promise<FlowCreationResult> {
  try {
    const response = await fetch('/api/reservations/flow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const error = await readApiError(response);
      return { kind: 'error', error: error.error ?? 'flow_unavailable', message: error.message ?? 'Não foi possível preparar sua reserva.' };
    }
    const flow = await response.json() as { flowId?: unknown; attemptId?: unknown; revision?: unknown };
    return typeof flow.flowId === 'string' && typeof flow.attemptId === 'string' && typeof flow.revision === 'number'
      ? { kind: 'created', flowId: flow.flowId, attemptId: flow.attemptId, revision: flow.revision }
      : { kind: 'error', error: 'invalid_flow', message: 'Não foi possível preparar sua reserva.' };
  } catch {
    return { kind: 'error', error: 'network_unavailable', message: 'Não foi possível verificar sua conexão. Tente novamente.' };
  }
}

async function requestSessionFlow(): Promise<SessionFlowResult> {
  try {
    const response = await fetch('/api/customer-auth/session', { cache: 'no-store' });
    if (!response.ok) {
      const error = await readApiError(response);
      return { kind: 'error', error: error.error ?? 'session_unavailable', message: error.message ?? 'Não foi possível verificar seu acesso.' };
    }
    const session = await response.json() as SessionResponse;
    if (session.status !== 'authenticated' || !session.user) return { kind: 'anonymous' };
    const flow = await createReservationFlow();
    if (flow.kind === 'error') return flow;
    return { kind: 'authenticated', user: session.user, flowId: flow.flowId, attemptId: flow.attemptId, revision: flow.revision };
  } catch {
    return { kind: 'error', error: 'network_unavailable', message: 'Não foi possível verificar sua conexão. Tente novamente.' };
  }
}

async function postCheckpoint(flowId: string, checkpoint: ReservationCheckpoint) {
  try {
    const response = await fetch('/api/customer-auth/check-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowId, stage: checkpoint }),
    });
    const error = response.ok ? {} : await readApiError(response);
    return { ok: response.ok, error: error.error ?? '', message: error.message ?? '' };
  } catch {
    return { ok: false, error: 'network_unavailable', message: 'Não foi possível verificar sua conexão. Tente novamente.' };
  }
}

type CheckpointRecoveryResult =
  | { kind: 'retry'; flowId: string; attempt: Extract<FlowCreationResult, { kind: 'created' }>; result: Awaited<ReturnType<typeof postCheckpoint>> }
  | Exclude<CheckpointResult, { kind: 'valid' }>;

async function recoverExpiredCheckpoint(checkpoint: ReservationCheckpoint): Promise<CheckpointRecoveryResult> {
  const renewed = await createReservationFlow();
  if (renewed.kind === 'error') {
    const reason = sessionLossReason(renewed.error);
    if (reason) return { kind: 'session-lost', reason };
    return { kind: 'error', message: renewed.message };
  }
  return {
    kind: 'retry',
    flowId: renewed.flowId,
    attempt: renewed,
    result: await postCheckpoint(renewed.flowId, checkpoint),
  };
}

async function checkReservationCheckpoint(flowId: string, checkpoint: ReservationCheckpoint): Promise<CheckpointResult> {
  let activeFlowId = flowId;
  let renewedAttempt: Extract<FlowCreationResult, { kind: 'created' }> | null = null;
  let result = await postCheckpoint(activeFlowId, checkpoint);
  if (result.error === 'flow_expired') {
    const recovery = await recoverExpiredCheckpoint(checkpoint);
    if (recovery.kind !== 'retry') return recovery;
    renewedAttempt = recovery.attempt;
    activeFlowId = recovery.flowId;
    result = recovery.result;
  }
  if (result.ok) return { kind: 'valid', flowId: activeFlowId, attemptId: renewedAttempt?.attemptId, revision: renewedAttempt?.revision };
  const reason = sessionLossReason(result.error);
  if (reason) return { kind: 'session-lost', reason };
  return { kind: 'error', message: result.message || 'Não foi possível verificar seu acesso. Tente novamente.' };
}

async function renewFlowAfterExpiration(status: number): Promise<ReservationSubmitResult> {
  const renewed = await createReservationFlow();
  if (renewed.kind === 'created') return { kind: 'flow-renewed', flowId: renewed.flowId, attemptId: renewed.attemptId, revision: renewed.revision };
  const reason = sessionLossReason(renewed.error);
  if (reason) return { kind: 'session-lost', reason };
  return { kind: 'error', error: renewed.error, message: renewed.message, status };
}

async function handleReservationResponse(response: Response): Promise<ReservationSubmitResult> {
  if (response.ok) return { kind: 'created', reservation: await response.json() as CreatedReservation };
  const error = await readApiError(response);
  const reason = sessionLossReason(error.error ?? '');
  if (reason) return { kind: 'session-lost', reason };
  if (error.error === 'flow_expired') return renewFlowAfterExpiration(response.status);
  return {
    kind: 'error',
    error: error.error ?? 'reservation_service_unavailable',
    message: reservationResponseMessage(error, response.status),
    status: response.status,
  };
}

function reservationResponseMessage(error: ApiErrorResponse, status: number): string {
  if (error.parseFailed || status >= 500) return 'Não foi possível concluir agora. Tente novamente.';
  return error.message ?? '';
}

async function submitAuthenticatedReservation(input: FormValues): Promise<ReservationSubmitResult> {
  try {
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return await handleReservationResponse(response);
  } catch {
    return { kind: 'error', error: 'network_unavailable', message: 'Não foi possível concluir agora. Tente novamente.', status: 503 };
  }
}

function hasHoldSelection(date: string, time: string, guests: number, attemptId: string): boolean {
  return Boolean(date && time && attemptId && Number.isInteger(guests) && guests > 0);
}

async function requestAutomaticHold(input: { date: string; time: string; guests: number; duration: number; attemptId: string; revision: number }): Promise<CreatedReservationHold & { attemptId: string; revision: number }> {
  const response = await fetch('/api/reservations/hold', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allocationMode: 'automatic', attemptId: input.attemptId, expectedRevision: input.revision, operationKey: `hold-${input.attemptId}-${input.revision}`, date: input.date, time: input.time, guests: input.guests, duration: input.duration }),
  });
  if (!response.ok) throw new Error(response.status === 409 ? 'hold_conflict' : 'hold_unavailable');
  return response.json() as Promise<CreatedReservationHold & { attemptId: string; revision: number }>;
}

const fieldsByStep: Partial<Record<number, FieldPath<FormValues>[]>> = {
  2: ['date', 'time'],
  3: ['guests'],
  4: ['specialNeeds', 'notes'],
};
const hoverFieldsByStep: Partial<Record<number, FieldPath<FormValues>[]>> = {
  ...fieldsByStep,
  3: ['date', 'time', 'guests'],
};

function isStepReadyForHover(step: number, values: FormValues): boolean {
  const result = authenticatedPublicReservationSchema.safeParse(values);
  if (step === 5) return result.success;
  const fields: FieldPath<FormValues>[] | undefined = hoverFieldsByStep[step];
  if (!fields) return false;
  return result.success || result.error.issues.every((issue) => !fields.includes(issue.path[0] as FieldPath<FormValues>));
}

function hasAvailableSelection(values: FormValues, { slots, isLoading, hasError }: Pick<WizardContentProps, 'slots' | 'isLoading' | 'hasError'>): boolean {
  if (isLoading || hasError) return false;
  return slots.some((slot) => slot.startTime === values.time && slot.eligibleGuestCounts.includes(values.guests));
}

function canAdvanceReservation(step: number, values: FormValues, contentProps: Pick<WizardContentProps, 'slots' | 'isLoading' | 'hasError'>, hasActiveHold: boolean): boolean {
  if (!isStepReadyForHover(step, values)) return false;
  if (step === 3 && !hasAvailableSelection(values, contentProps)) return false;
  return step !== 5 || hasActiveHold;
}

function useActiveHold(expiresAt: number | null): boolean {
  const [expiredHoldAt, setExpiredHoldAt] = useState<number | null>(null);
  useEffect(() => {
    if (expiresAt === null) return;
    const timer = window.setTimeout(() => setExpiredHoldAt(expiresAt), Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expiresAt]);
  return expiresAt !== null && expiredHoldAt !== expiresAt;
}

const checkpointByStep: Partial<Record<number, ReservationCheckpoint>> = {
  2: 'data',
  3: 'time',
  4: 'preferences',
};

type AdvanceReservationStepParams = {
  step: number;
  completedCheckpoints: ReservationCheckpoint[];
  trigger: (fields: FieldPath<FormValues>[]) => Promise<boolean>;
  createHold: () => Promise<boolean>;
  checkCheckpoint: (checkpoint: ReservationCheckpoint) => Promise<boolean>;
  markCheckpointCompleted: (checkpoint: ReservationCheckpoint) => void;
  setStep: (step: number) => void;
};

async function advanceReservationStep({
  step,
  completedCheckpoints,
  trigger,
  createHold,
  checkCheckpoint,
  markCheckpointCompleted,
  setStep,
}: AdvanceReservationStepParams): Promise<void> {
  const fields = fieldsByStep[step];
  const checkpoint = checkpointByStep[step];
  if (!fields || !checkpoint) return;
  if (!(await trigger(fields))) return;
  if (step === 3 && !(await createHold())) return;
  if (!completedCheckpoints.includes(checkpoint) && !(await checkCheckpoint(checkpoint))) return;
  markCheckpointCompleted(checkpoint);
  setStep(step + 1);
}

function reservationErrorMessage(error: string, message: string, status: number): string {
  if (status >= 500) return 'Não foi possível concluir agora. Tente novamente.';
  if (error === 'hold_required') return 'A manutenção da mesa expirou. Volte ao horário para escolher novamente.';
  if (status === 409 && error === 'reservation_unavailable') return 'Esse horário acabou de ser ocupado. Escolha outro horário, por favor.';
  return message || 'Não foi possível concluir agora. Tente novamente.';
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-status-danger">{message}</p>;
}

function FormField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground">
        <Icon aria-hidden="true" size={16} strokeWidth={1.7} />
        {label}
      </span>
      {children}
    </label>
  );
}

function StepDate({
  register,
  errorDate,
  errorGuests,
}: {
  register: UseFormRegister<FormValues>;
  errorDate?: string;
  errorGuests?: string;
}) {
  return (
    <div className="reservation-date-fields grid gap-5 sm:grid-cols-2">
      <FormField label="Quando você deseja vir?" icon={CalendarDays}>
        <input
          {...register('date')}
          type="date"
          min={todayIso()}
          className="reservation-input"
          aria-invalid={Boolean(errorDate)}
        />
        <div><FieldError message={errorDate} /></div>
      </FormField>
      <FormField label="Quantas pessoas?" icon={Users}>
        <select
          {...register('guests', { valueAsNumber: true })}
          className="reservation-input"
          aria-invalid={Boolean(errorGuests)}
        >
          <option value={0}>Selecione</option>
          {Array.from({ length: 20 }, (_, index) => index + 1).map((count) => (
            <option key={count} value={count}>{count} {count === 1 ? 'pessoa' : 'pessoas'}</option>
          ))}
        </select>
        <div>
          <FieldError message={errorGuests} />
          <span className="mt-2 block text-xs text-muted">Para grupos acima de 20 pessoas, fale com nossa equipe.</span>
        </div>
      </FormField>
    </div>
  );
}

function StepAvailability({
  date,
  guests,
  slots,
  isLoading,
  hasError,
  selectedTime,
  selectedTableIds,
  setValue,
  errorTime,
  holdExpiresAt,
}: {
  date: string;
  guests: number;
  slots: AvailabilitySlot[];
  isLoading: boolean;
  hasError: boolean;
  selectedTime: string;
  selectedTableIds: number[];
  setValue: UseFormSetValue<FormValues>;
  errorTime?: string;
  holdExpiresAt: number | null;
}) {
  const selectedSlot = slots.find((slot) => slot.startTime === selectedTime);
  const chooseSlot = (slot: AvailabilitySlot) => {
    setValue('time', slot.startTime, { shouldValidate: true });
    setValue('tableIds', slot.options[0]?.tableIds ?? [], { shouldValidate: true });
  };
  const chooseOption = (option: AvailabilityOption) => {
    setValue('tableIds', option.tableIds, { shouldValidate: true });
  };

  if (isLoading) {
    return <LoadingState label="Consultando os horários do salão..." />;
  }
  if (hasError) {
    return <EmptyAvailability label="Não foi possível consultar a disponibilidade agora." date={date} guests={guests} />;
  }
  if (slots.length === 0) {
    return <EmptyAvailability label="Ainda não há horários configurados para esta data." date={date} guests={guests} />;
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-3 text-sm font-semibold tracking-wide text-foreground">Escolha um horário</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {slots.map((slot) => (
            <button
              key={slot.startTime}
              type="button"
              onClick={() => chooseSlot(slot)}
              aria-pressed={selectedTime === slot.startTime}
              className={`reservation-choice ${selectedTime === slot.startTime ? 'reservation-choice-selected' : ''}`}
            >
              <Clock3 aria-hidden="true" size={16} />
              {slot.startTime}
            </button>
          ))}
        </div>
        <FieldError message={errorTime} />
      </div>

      {selectedSlot && (
        <div>
          <p className="mb-3 text-sm font-semibold tracking-wide text-foreground">Prefira uma mesa</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedSlot.options.map((option) => {
              const selected = option.tableIds.every((tableId) => selectedTableIds.includes(tableId))
                && option.tableIds.length === selectedTableIds.length;
              return (
                <button
                  key={`${option.combinationId ?? 'table'}-${option.tableIds.join('-')}`}
                  type="button"
                  onClick={() => chooseOption(option)}
                  aria-pressed={selected}
                  className={`reservation-choice justify-between ${selected ? 'reservation-choice-selected' : ''}`}
                >
                  <span>
                    {option.combinationId ? `Mesas ${option.tableIds.join(' + ')}` : `Mesa ${option.tableIds[0]}`}
                  </span>
                  <span className="text-xs opacity-75">até {option.capacityMax} pessoas</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {holdExpiresAt && (
        <p role="status" className="rounded-[var(--radius-sm)] border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
          Sua mesa está temporariamente reservada até {formatHoldExpiry(holdExpiresAt)}. Finalize seus dados para confirmar a experiência.
        </p>
      )}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-muted/40 p-6 text-sm text-muted">
      <LoaderCircle aria-hidden="true" className="animate-spin" size={20} />
      {label}
    </div>
  );
}

function EmptyAvailability({ label, date, guests }: { label: string; date: string; guests: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted/40 p-6">
      <div className="flex items-start gap-3 text-sm text-muted">
        <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={19} />
        <span>{label} <a className="text-primary underline underline-offset-4" href="/whatsapp-reservas">Fale com nossa equipe pelo WhatsApp.</a></span>
      </div>
      <WaitlistForm date={date} guests={guests} />
    </div>
  );
}

function Confirmation({ reservation }: { reservation: CreatedReservation }) {
  return (
    <>
      <ReservationCheckout reservationId={reservation.reservationId} publicCode={reservation.publicCode} />
      <section className="mx-auto max-w-3xl px-5 pb-12 text-center text-foreground">
        <div className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-border bg-surface p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Acesso à reserva</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">Guarde o código e use o link privado para acompanhar ou cancelar a reserva.</p>
          <Link href={`/minha-reserva/${reservation.secureToken}`} className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-primary bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20">
            Acessar minha reserva <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <details className="mx-auto mt-5 max-w-xl rounded-[var(--radius-lg)] border border-border bg-surface p-4 text-left sm:p-5">
          <summary className="cursor-pointer text-sm font-semibold text-primary">Abrir simulação rápida de pagamento</summary>
          <MockPaymentDemo reservationId={reservation.reservationId} publicCode={reservation.publicCode} />
        </details>
      </section>
    </>
  );
}

function StepIndicators({ currentStep }: { currentStep: number }) {
  return <div className="reservation-stepper-container" aria-label="Etapas da reserva">{steps.map((label, index) => <StepIndicatorItem key={label} label={label} number={index + 1} currentStep={currentStep} />)}</div>;
}

function StepIndicatorItem({ label, number, currentStep }: { label: string; number: number; currentStep: number }) {
  const state = getStepState(currentStep, number);
  const completed = state === 'completed';
  const active = state === 'current';
  return <div className="reservation-stepper-item"><div className="reservation-stepper-marker-wrap"><span aria-current={active ? 'step' : undefined} aria-label={getStepStateLabel(label, state)} className={`reservation-stepper-marker ${stepMarkerClass[state]}`}>{renderStepMarker(state, number)}</span><span className={`reservation-stepper-label ${stepLabelClass[state]}`}>{label}</span></div>{number < steps.length && <span className={`reservation-stepper-connector ${completed ? 'reservation-stepper-connector-completed' : ''}`} aria-hidden="true" />}</div>;
}

type StepState = 'completed' | 'current' | 'future';
const stepMarkerClass: Record<StepState, string> = { completed: 'reservation-stepper-marker-completed', current: 'reservation-stepper-marker-current', future: '' };
const stepLabelClass: Record<StepState, string> = { completed: 'reservation-stepper-label-active', current: 'reservation-stepper-label-active', future: '' };
function getStepState(currentStep: number, number: number): StepState { if (currentStep > number) return 'completed'; if (currentStep === number) return 'current'; return 'future'; }
function getStepStateLabel(label: string, state: StepState): string { if (state === 'completed') return `${label}, concluída`; if (state === 'current') return `${label}, etapa atual`; return `${label}, etapa futura`; }
function renderStepMarker(state: StepState, number: number) { return state === 'completed' ? <Check aria-hidden="true" size={16} strokeWidth={2.4} /> : number; }

type WizardContentProps = {
  step: number;
  date: string;
  guests: number;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  slots: AvailabilitySlot[];
  isLoading: boolean;
  hasError: boolean;
  selectedTime: string;
  selectedTableIds: number[];
  hasActiveHold?: boolean;
  setValue: UseFormSetValue<FormValues>;
  specialNeeds: string[];
  notes?: string;
  holdExpiresAt: number | null;
};

function WizardContent({
  step,
  date,
  guests,
  register,
  errors,
  slots,
  isLoading,
  hasError,
  selectedTime,
  selectedTableIds,
  hasActiveHold = false,
  setValue,
  specialNeeds,
  notes = '',
  holdExpiresAt,
}: WizardContentProps) {
  return <div className="reservation-wizard-step"><WizardStepContent step={step} date={date} guests={guests} register={register} errors={errors} slots={slots} isLoading={isLoading} hasError={hasError} selectedTime={selectedTime} selectedTableIds={selectedTableIds} hasActiveHold={hasActiveHold} setValue={setValue} specialNeeds={specialNeeds} notes={notes} holdExpiresAt={holdExpiresAt} /></div>;
}

function WizardStepContent({ step, date, guests, register, errors, slots, isLoading, hasError, selectedTime, selectedTableIds, hasActiveHold = false, setValue, specialNeeds, notes = '' }: WizardContentProps) {
  const selectedSlot = slots.find((candidate) => candidate.startTime === selectedTime);
  const contentByStep = {
    1: <ReservationAccessGate />,
    2: <StepDateAndTime register={register as never} selectedDate={date} dateError={errors.date?.message} timeError={errors.time?.message} slots={slots} isLoading={isLoading} hasError={hasError} selectedTime={selectedTime} setValue={setValue as never} />,
    3: <StepGuests register={register as never} setValue={setValue as never} selectedGuests={guests} selectedTime={selectedTime} slot={selectedSlot} selectedTableIds={selectedTableIds} hasActiveHold={hasActiveHold} error={errors.guests?.message} />,
    4: <ReservationPreferencesStep register={register} setValue={setValue} selectedNeeds={specialNeeds} notes={notes} errors={errors} />,
  };
  return contentByStep[step as keyof typeof contentByStep] ?? null;
}

type WizardActionProps = {
  step: number;
  canGoBack: boolean;
  canAdvance: boolean;
  isSubmitting: boolean;
  isAdvancing: boolean;
  isHolding: boolean;
  onBack: () => void;
  onNext: () => void;
};

function ContinueWizardAction({ canGoBack, canAdvance, isSubmitting, isAdvancing, isHolding, onBack, onNext }: WizardActionProps) {
  const isBusy = isSubmitting || isHolding || isAdvancing;
  const icon = isHolding || isAdvancing
    ? <LoaderCircle aria-hidden="true" className="animate-spin" size={20} />
    : <ArrowRight aria-hidden="true" size={20} />;
  const label = isHolding ? 'Reservando...' : isAdvancing ? 'Verificando acesso...' : 'Continuar';
  return (
    <div className="reservation-wizard-actions">
      {canGoBack && <button type="button" onClick={onBack} disabled={isBusy} data-hover-enabled="true" className="reservation-wizard-action reservation-wizard-action--back"><ArrowLeft aria-hidden="true" size={20} /><span>Voltar</span></button>}
      <button type="button" onClick={onNext} disabled={isBusy} data-hover-enabled={canAdvance} className="reservation-wizard-action reservation-wizard-action--forward"><span>{label}</span>{icon}</button>
    </div>
  );
}

function ConfirmWizardAction({ isSubmitting, isHolding, isAdvancing, canGoBack, canAdvance, onBack }: WizardActionProps) {
  const isBusy = isSubmitting || isHolding || isAdvancing;
  return (
    <div className="reservation-wizard-actions">
      {canGoBack && <button type="button" onClick={onBack} disabled={isBusy} data-hover-enabled="true" className="reservation-wizard-action reservation-wizard-action--back"><ArrowLeft aria-hidden="true" size={20} /><span>Voltar</span></button>}
      <button type="submit" disabled={isBusy} data-hover-enabled={canAdvance} className="reservation-wizard-action reservation-wizard-action--forward"><span>{isSubmitting ? 'Enviando...' : 'Confirmar reserva'}</span>{isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={20} /> : <Check aria-hidden="true" size={20} />}</button>
    </div>
  );
}

function WizardActions(props: WizardActionProps) {
  return props.step < 5 ? <ContinueWizardAction {...props} /> : <ConfirmWizardAction {...props} />;
}

type ReservationFormProps = Omit<WizardContentProps, 'step'> & {
  step: number;
  canGoBack: boolean;
  values: FormValues;
  holdExpiresAt: number | null;
  submitError: string;
  isHolding: boolean;
  isSubmitting: boolean;
  isAdvancing: boolean;
  onSubmit: (values: FormValues) => Promise<void>;
  onInvalid: (errors: FieldErrors<FormValues>) => void;
  onEdit: (step: number) => void;
  user: ReservationUser | null;
  onBack: () => void;
  onNext: () => void;
  handleSubmit: ReturnType<typeof useForm<FormValues>>['handleSubmit'];
};

function ReservationForm({
  step,
  canGoBack,
  values,
  holdExpiresAt,
  submitError,
  isHolding,
  isSubmitting,
  isAdvancing,
  onSubmit,
  onInvalid,
  onEdit,
  user,
  onBack,
  onNext,
  handleSubmit,
  ...contentProps
}: ReservationFormProps) {
  const hasActiveHold = useActiveHold(holdExpiresAt);
  const canAdvance = canAdvanceReservation(step, values, contentProps, hasActiveHold);
  const content = <WizardContent step={step} holdExpiresAt={holdExpiresAt} hasActiveHold={hasActiveHold} notes={values.notes} {...contentProps} />;
  if (step === 1) {
    return <div className="reservation-panel">{content}</div>;
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit, onInvalid)} className={`reservation-panel ${step === 5 ? 'reservation-panel-review' : ''}`}>
      {content}
      {step === 5 && <ReservationReview values={values} holdExpiresAt={holdExpiresAt} user={user} onEdit={onEdit} />}
      {submitError && <p className="mt-5 rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{submitError}</p>}
      <WizardActions step={step} canGoBack={canGoBack} canAdvance={canAdvance} isSubmitting={isSubmitting} isHolding={isHolding} isAdvancing={isAdvancing} onBack={onBack} onNext={onNext} />
    </form>
  );
}

type ReservationShellProps = {
  step: number;
  canGoBack: boolean;
  date: string;
  guests: number;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  slots: AvailabilitySlot[];
  isLoading: boolean;
  hasError: boolean;
  selectedTime: string;
  selectedTableIds: number[];
  setValue: UseFormSetValue<FormValues>;
  specialNeeds: string[];
  values: FormValues;
  holdExpiresAt: number | null;
  submitError: string;
  isHolding: boolean;
  isSubmitting: boolean;
  isAdvancing: boolean;
  onSubmit: (values: FormValues) => Promise<void>;
  onInvalid: (errors: FieldErrors<FormValues>) => void;
  onEdit: (step: number) => void;
  onBack: () => void;
  onNext: () => void;
  handleSubmit: ReturnType<typeof useForm<FormValues>>['handleSubmit'];
  user: ReservationUser | null;
};

function ReservationShell({
  step,
  canGoBack,
  date,
  guests,
  register,
  errors,
  slots,
  isLoading,
  hasError,
  selectedTime,
  selectedTableIds,
  setValue,
  specialNeeds,
  values,
  holdExpiresAt,
  submitError,
  isHolding,
  isSubmitting,
  isAdvancing,
  onSubmit,
  onInvalid,
  onEdit,
  onBack,
  onNext,
  handleSubmit,
  user,
}: ReservationShellProps) {
  return (
    <>
      <div className="reservation-header-container mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">The Wine Experience</p>
        <h1 className="mt-4 font-display text-5xl leading-none text-foreground sm:text-6xl">Reserve sua experiência</h1>
      </div>
      <StepIndicators currentStep={step} />
      <div className="reservation-card-grid">
        <ReservationForm
          step={step}
          canGoBack={canGoBack}
          date={date}
          guests={guests}
          register={register}
          errors={errors}
          slots={slots}
          isLoading={isLoading}
          hasError={hasError}
          selectedTime={selectedTime}
          selectedTableIds={selectedTableIds}
          setValue={setValue}
          specialNeeds={specialNeeds}
          holdExpiresAt={holdExpiresAt}
          values={values}
          submitError={submitError}
          isHolding={isHolding}
          isSubmitting={isSubmitting}
          isAdvancing={isAdvancing}
          onSubmit={onSubmit}
          onInvalid={onInvalid}
          onEdit={onEdit}
          onBack={onBack}
          onNext={onNext}
          handleSubmit={handleSubmit}
          user={user}
        />
      </div>
    </>
  );
}

function ReservationInitialization({
  authState,
  message,
  onRetry,
}: {
  authState: 'checking' | 'error';
  message: string;
  onRetry: () => void;
}) {
  if (authState === 'checking') {
    return <main className="reservation-theme min-h-screen bg-background px-5 py-24 text-foreground"><p className="mx-auto flex max-w-md items-center justify-center gap-3 text-sm text-muted" role="status"><LoaderCircle aria-hidden="true" className="animate-spin text-primary" size={18} /> Confirmando seu acesso…</p></main>;
  }
  return <main className="reservation-theme min-h-screen bg-background px-5 py-24 text-foreground"><section className="mx-auto max-w-lg rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center sm:p-9"><CircleAlert aria-hidden="true" className="mx-auto text-primary" size={28} /><h1 className="mt-4 font-display text-3xl">Não conseguimos iniciar sua reserva</h1><p className="mt-3 text-sm leading-relaxed text-muted">{message}</p><button type="button" onClick={onRetry} className="reservation-primary-button mt-6 justify-center"><ArrowRight aria-hidden="true" size={16} /> Tentar novamente</button><Link href="/" className="mt-5 block text-sm text-muted underline underline-offset-4">Voltar ao site</Link></section></main>;
}

function ReservationWizardContent({
  authState,
  authError,
  onRetry,
  confirmation,
  shellProps,
}: {
  authState: 'checking' | 'error' | 'ready';
  authError: string;
  onRetry: () => void;
  confirmation: CreatedReservation | null;
  shellProps: ReservationShellProps;
}) {
  if (authState !== 'ready') {
    return <ReservationInitialization authState={authState} message={authError} onRetry={onRetry} />;
  }

  return (
    <main className="reservation-theme reservation-page-wrapper font-sans text-foreground">
      <div className="reservation-page-content">
        {confirmation ? <Confirmation reservation={confirmation} /> : <ReservationShell {...shellProps} />}
      </div>
    </main>
  );
}

export function ReservationWizard() {
  const router = useRouter();
  const storedStep = useReservationWizardStore((state) => state.step);
  const minimumStep = useReservationWizardStore((state) => state.minimumStep);
  const setStep = useReservationWizardStore((state) => state.setStep);
  const flowId = useReservationWizardStore((state) => state.flowId);
  const completedCheckpoints = useReservationWizardStore((state) => state.completedCheckpoints);
  const setFlowId = useReservationWizardStore((state) => state.setFlowId);
  const startAuthenticatedFlow = useReservationWizardStore((state) => state.startAuthenticatedFlow);
  const markCheckpointCompleted = useReservationWizardStore((state) => state.markCheckpointCompleted);
  const resetWizard = useReservationWizardStore((state) => state.reset);
  const [confirmation, setConfirmation] = useState<CreatedReservation | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [hold, setHold] = useState<{ selectionKey: string; expiresAt: number } | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [attemptRevision, setAttemptRevision] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [authState, setAuthState] = useState<'checking' | 'ready' | 'error'>('checking');
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState<ReservationUser | null>(null);
  const navigationBoundary = user ? 2 : minimumStep;
  const step = Math.max(storedStep, navigationBoundary);
  const canGoBack = step > navigationBoundary;
  const navigationLock = useRef(false);
  const holdLock = useRef(false);
  const submitLock = useRef(false);
  const submissionKeys = useRef(new Map<string, string>());
  const initializationId = useRef(0);
  const initializationDelay = useRef<CancelableDelay | null>(null);
  const mountedRef = useRef(false);
  const {
    register,
    handleSubmit,
    trigger,
    control,
    setValue,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(authenticatedPublicReservationSchema) as never,
    defaultValues: defaultReservationValues,
    mode: 'onTouched',
  });
  const date = useWatch({ control, name: 'date' });
  const guests = useWatch({ control, name: 'guests' });
  const duration = useWatch({ control, name: 'duration' });
  const time = useWatch({ control, name: 'time' });
  const tableIds = useWatch({ control, name: 'tableIds' });
  const specialNeeds = useWatch({ control, name: 'specialNeeds' });
  const values = useWatch({ control }) as FormValues;
  const selectionKey = [date, guests, duration, time].join('|');
  const holdExpiresAt = hold?.selectionKey === selectionKey ? hold.expiresAt : null;
  const availabilityQuery = useQuery({
    queryKey: ['reservation-availability', date, duration],
    queryFn: () => fetchAvailability(date, duration),
    enabled: Boolean(date),
  });
  const acceptAuthenticatedFlow = useCallback((nextUser: ReservationUser, nextFlowId: string, nextAttemptId: string, nextRevision: number) => {
    setUser(nextUser);
    setAttemptId(nextAttemptId);
    setAttemptRevision(nextRevision);
    startAuthenticatedFlow(nextFlowId);
    setValue('flowId', nextFlowId, { shouldDirty: false, shouldValidate: false });
    setValue('attemptId', nextAttemptId, { shouldDirty: false, shouldValidate: false });
    setValue('expectedRevision', nextRevision, { shouldDirty: false, shouldValidate: false });
    setSubmitError('');
    setAuthError('');
    setAuthState('ready');
  }, [setValue, startAuthenticatedFlow]);

  const redirectAfterSessionLoss = useCallback((reason: 'expired' | 'changed') => {
    resetWizard();
    resetForm(defaultReservationValues);
    setUser(null);
    setAttemptId('');
    setAttemptRevision(0);
    setHold(null);
    router.replace(customerAuthHref('/reservas', reason));
  }, [resetForm, resetWizard, router]);

  const applyReservationSessionResult = useCallback((result: SessionFlowResult) => {
    if (result.kind === 'anonymous') {
      setUser(null);
      setStep(1);
      setAuthState('ready');
      return;
    }
    if (result.kind === 'error') {
      if (result.error === 'session_expired' || result.error === 'account_changed') {
        redirectAfterSessionLoss(result.error === 'account_changed' ? 'changed' : 'expired');
        return;
      }
      setAuthError(result.message);
      setAuthState('error');
      return;
    }
    acceptAuthenticatedFlow(result.user, result.flowId, result.attemptId, result.revision);
  }, [acceptAuthenticatedFlow, redirectAfterSessionLoss, setStep]);

  const initializeReservationSession = useCallback(async () => {
    if (!mountedRef.current) return;
    const currentId = ++initializationId.current;
    initializationDelay.current?.cancel();
    const delay = createCancelableDelay(1000);
    initializationDelay.current = delay;
    setAuthState('checking');
    const [result] = await Promise.all([requestSessionFlow(), delay.promise]);
    if (!mountedRef.current || currentId !== initializationId.current) return;
    initializationDelay.current = null;
    applyReservationSessionResult(result);
  }, [applyReservationSessionResult]);

  useEffect(() => {
    mountedRef.current = true;
    resetWizard();
    resetForm(defaultReservationValues);
    queueMicrotask(() => { void initializeReservationSession(); });

    return () => {
      mountedRef.current = false;
      initializationId.current += 1;
      initializationDelay.current?.cancel();
      initializationDelay.current = null;
      resetWizard();
    };
  }, [initializeReservationSession, resetForm, resetWizard]);

  const invalidateSession = (reason: 'expired' | 'changed') => {
    redirectAfterSessionLoss(reason);
  };

  const createHold = async (): Promise<boolean> => {
    if (holdLock.current) return false;
    if (!hasHoldSelection(date, time, guests, attemptId)) {
      setSubmitError('Escolha a data, o horário e a quantidade de pessoas antes de continuar.');
      return false;
    }

    holdLock.current = true;
    setSubmitError('');
    setIsHolding(true);
    try {
      const hold = await requestAutomaticHold({ date, time, guests, duration, attemptId, revision: attemptRevision });
      setAttemptRevision(hold.revision);
      setValue('allocationMode', 'automatic', { shouldDirty: false, shouldValidate: false });
      setValue('attemptId', hold.attemptId, { shouldDirty: false, shouldValidate: false });
      setValue('expectedRevision', hold.revision, { shouldDirty: false, shouldValidate: false });
      setValue('tableIds', hold.tableIds, { shouldValidate: true });
      setHold({ selectionKey, expiresAt: hold.expiresAt });
      return true;
    } catch (error) {
      setSubmitError(error instanceof Error && error.message === 'hold_conflict'
        ? 'Esse horário acabou de ser ocupado. Escolha outro horário, por favor.'
        : 'Não foi possível reservar a mesa agora. Tente novamente em instantes.');
      return false;
    } finally {
      holdLock.current = false;
      setIsHolding(false);
    }
  };

  const checkCheckpoint = async (checkpoint: ReservationCheckpoint): Promise<boolean> => {
    if (!flowId) {
      setSubmitError('Não foi possível validar sua sessão. Tente novamente.');
      return false;
    }
    const result = await checkReservationCheckpoint(flowId, checkpoint);
    if (result.kind === 'session-lost') {
      invalidateSession(result.reason);
      return false;
    }
    if (result.kind === 'error') {
      setSubmitError(result.message);
      return false;
    }
    if (result.flowId !== flowId) {
      setFlowId(result.flowId);
      setValue('flowId', result.flowId, { shouldDirty: false, shouldValidate: false });
    }
    if (result.attemptId && result.revision !== undefined) {
      setAttemptId(result.attemptId);
      setAttemptRevision(result.revision);
    }
    return true;
  };

  const goNext = async () => {
    if (navigationLock.current || step < 2 || step > 4) return;
    navigationLock.current = true;
    setIsAdvancing(true);
    setSubmitError('');
    try {
      await advanceReservationStep({
        step,
        completedCheckpoints,
        trigger,
        createHold,
        checkCheckpoint,
        markCheckpointCompleted,
        setStep,
      });
    } finally {
      navigationLock.current = false;
      setIsAdvancing(false);
    }
  };
  const goBack = () => {
    if (!canGoBack || navigationLock.current || holdLock.current || submitLock.current) return;
    setStep(step - 1);
  };
  const submit = async (input: FormValues) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitError('');
    try {
      const contentKey = reservationContentKey(input);
      const submissionId = submissionKeys.current.get(contentKey) ?? crypto.randomUUID();
      submissionKeys.current.set(contentKey, submissionId);
      const result = await submitAuthenticatedReservation({
        ...input,
        allocationMode: 'automatic',
        attemptId,
        expectedRevision: attemptRevision,
        submissionId,
      });
      if (result.kind === 'created') {
        setConfirmation(result.reservation);
        setStep(6);
        return;
      }
      if (result.kind === 'session-lost') {
        invalidateSession(result.reason);
        return;
      }
      if (result.kind === 'flow-renewed') {
        setFlowId(result.flowId);
        setAttemptId(result.attemptId);
        setAttemptRevision(result.revision);
        setValue('flowId', result.flowId, { shouldDirty: false, shouldValidate: false });
        setSubmitError('O acesso à reserva foi renovado. Confira os detalhes e confirme novamente.');
        return;
      }
      if (result.status === 409) setHold(null);
      setSubmitError(reservationErrorMessage(result.error, result.message, result.status));
    } catch {
      setSubmitError('Não foi possível concluir agora. Tente novamente.');
    } finally {
      submitLock.current = false;
    }
  };

  const onInvalidSubmit = (fieldErrors: FieldErrors<FormValues>) => {
    const firstMessage = Object.values(fieldErrors)
      .map((error) => error?.message)
      .find((message): message is string => typeof message === 'string');
    setSubmitError(firstMessage ?? 'Confira os dados da reserva antes de confirmar.');
  };

  useEffect(() => {
    if (step !== 5 || !attemptId || !tableIds.length) return;
    const contentKey = reservationContentKey({ date, time, guests, duration, tableIds, specialNeeds, notes: values.notes });
    const submissionId = submissionKeys.current.get(contentKey) ?? crypto.randomUUID();
    submissionKeys.current.set(contentKey, submissionId);
    setValue('attemptId', attemptId, { shouldDirty: false, shouldValidate: false });
    setValue('expectedRevision', attemptRevision, { shouldDirty: false, shouldValidate: false });
    setValue('submissionId', submissionId, { shouldDirty: false, shouldValidate: false });
  }, [attemptId, attemptRevision, date, duration, guests, setValue, specialNeeds, step, tableIds, time, values.notes]);

  return (
    <ReservationWizardContent
      authState={authState}
      authError={authError}
      onRetry={() => { void initializeReservationSession(); }}
      confirmation={confirmation}
      shellProps={{
        step,
        canGoBack,
        date,
        guests,
        register,
        errors,
        slots: availabilityQuery.data?.slots ?? [],
        isLoading: availabilityQuery.isLoading,
        hasError: availabilityQuery.isError,
        selectedTime: time,
        selectedTableIds: tableIds,
        setValue,
        specialNeeds,
        holdExpiresAt,
        values,
        submitError,
        isHolding,
        isAdvancing,
        isSubmitting,
        user,
        onSubmit: submit,
        onInvalid: onInvalidSubmit,
        onEdit: (editStep) => setStep(editStep),
        onBack: goBack,
        onNext: goNext,
        handleSubmit,
      }}
    />
  );
}
