'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
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
import { MockPaymentDemo } from './MockPaymentDemo';
import { WaitlistForm } from './WaitlistForm';
import { authenticatedPublicReservationSchema, type AuthenticatedPublicReservationInput } from '@/modules/reservations/schemas/public-reservation-schema';
import { CustomerAuthStep } from './CustomerAuthStep';
import { ReservationPreferencesStep } from './ReservationPreferencesStep';
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
type SessionResponse = { status?: string; user?: ReservationUser };
type ApiErrorResponse = { error?: string; message?: string };

const steps = ['Seus dados', 'Data', 'Horário', 'Preferências', 'Confirmação'];
const defaultReservationValues: FormValues = {
  flowId: '',
  date: '',
  time: '',
  guests: 0,
  duration: 120,
  tableIds: [],
  specialNeeds: [],
  notes: '',
};

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
  guests: number,
  duration: number,
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({ date, guests: String(guests), duration: String(duration) });
  const response = await fetch(`/api/reservations/availability?${params}`);
  if (!response.ok) throw new Error('availability_unavailable');
  return response.json();
}

type SessionFlowResult =
  | { kind: 'anonymous' }
  | { kind: 'authenticated'; user: ReservationUser; flowId: string }
  | { kind: 'error'; error: string; message: string };

type FlowCreationResult = { kind: 'created'; flowId: string } | { kind: 'error'; error: string; message: string };
type CheckpointResult = { kind: 'valid'; flowId: string } | { kind: 'session-lost'; reason: 'expired' | 'changed' } | { kind: 'error'; message: string };
type ReservationSubmitResult =
  | { kind: 'created'; reservation: CreatedReservation }
  | { kind: 'flow-renewed'; flowId: string }
  | { kind: 'session-lost'; reason: 'expired' | 'changed' }
  | { kind: 'error'; error: string; message: string; status: number };

function sessionLossReason(error: string): 'expired' | 'changed' | null {
  if (error === 'session_expired') return 'expired';
  if (error === 'account_changed') return 'changed';
  return null;
}

async function readApiError(response: Response): Promise<ApiErrorResponse> {
  return response.json().catch(() => ({})) as Promise<ApiErrorResponse>;
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
    const flow = await response.json() as { flowId?: unknown };
    return typeof flow.flowId === 'string'
      ? { kind: 'created', flowId: flow.flowId }
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
    return { kind: 'authenticated', user: session.user, flowId: flow.flowId };
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

async function checkReservationCheckpoint(flowId: string, checkpoint: ReservationCheckpoint): Promise<CheckpointResult> {
  let activeFlowId = flowId;
  let result = await postCheckpoint(activeFlowId, checkpoint);
  if (result.error === 'flow_expired') {
    const renewed = await createReservationFlow();
    if (renewed.kind === 'error') {
      const reason = sessionLossReason(renewed.error);
      if (reason) return { kind: 'session-lost', reason };
      return { kind: 'error', message: renewed.message };
    }
    activeFlowId = renewed.flowId;
    result = await postCheckpoint(activeFlowId, checkpoint);
  }
  if (result.ok) return { kind: 'valid', flowId: activeFlowId };
  const reason = sessionLossReason(result.error);
  if (reason) return { kind: 'session-lost', reason };
  return { kind: 'error', message: result.message || 'Não foi possível verificar seu acesso. Tente novamente.' };
}

async function renewFlowAfterExpiration(status: number): Promise<ReservationSubmitResult> {
  const renewed = await createReservationFlow();
  if (renewed.kind === 'created') return { kind: 'flow-renewed', flowId: renewed.flowId };
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
  return { kind: 'error', error: error.error ?? 'reservation_unavailable', message: error.message ?? '', status: response.status };
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
    return { kind: 'error', error: 'network_unavailable', message: 'Não foi possível concluir agora. Tente novamente em instantes.', status: 503 };
  }
}

const fieldsByStep: Partial<Record<number, FieldPath<FormValues>[]>> = {
  2: ['date', 'guests'],
  3: ['time'],
  4: ['specialNeeds', 'notes'],
};
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

function reservationErrorMessage(error: string, message: string): string {
  if (error === 'hold_required') return 'A manutenção da mesa expirou. Volte ao horário para escolher novamente.';
  if (error === 'reservation_unavailable') return 'Esse horário acabou de ser ocupado. Escolha outro horário, por favor.';
  return message || 'Não foi possível concluir agora. Tente novamente em instantes.';
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
        <FieldError message={errorDate} />
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
        <FieldError message={errorGuests} />
        <span className="mt-2 block text-xs text-muted">Para grupos acima de 20 pessoas, fale com nossa equipe.</span>
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

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <strong className="text-right text-sm text-foreground">{value}</strong>
    </div>
  );
}

function StepReview({ values, holdExpiresAt, user }: { values: FormValues; holdExpiresAt: number | null; user: ReservationUser | null }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted/50 p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-primary">
        <Check aria-hidden="true" size={18} />
        <span className="text-sm font-semibold tracking-wide">Confira os detalhes</span>
      </div>
      <SummaryItem label="Data" value={values.date.split('-').reverse().join('/')} />
      <SummaryItem label="Horário" value={`${values.time} · ${values.duration} minutos`} />
      <SummaryItem label="Pessoas" value={String(values.guests)} />
      <SummaryItem label="Mesa" value={values.tableIds.length ? values.tableIds.join(' + ') : 'A definir pela equipe'} />
      <SummaryItem label="Conta" value={user?.name ?? 'Conta autenticada'} />
      {holdExpiresAt && <p role="status" className="mt-5 rounded-[var(--radius-sm)] border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-primary">Mesa mantida até {formatHoldExpiry(holdExpiresAt)}. A confirmação precisa ser concluída antes desse horário.</p>}
      <p className="mt-5 text-xs leading-relaxed text-muted">A reserva será criada sem cobrança real. Na confirmação, você poderá visualizar o checkout demonstrativo e seus estados.</p>
    </div>
  );
}

function Confirmation({ reservation }: { reservation: CreatedReservation }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="reservation-confirmation-container mx-auto max-w-xl rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check aria-hidden="true" size={28} strokeWidth={2.2} />
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Reserva recebida</p>
      <h2 className="mt-3 font-display text-4xl text-foreground">Sua experiência está a caminho.</h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">Anotamos sua reserva. Guarde o código abaixo e acesse o link privado para acompanhar os detalhes.</p>
      <div className="mt-7 rounded-[var(--radius-md)] border border-border bg-surface-muted p-4">
        <span className="block text-xs uppercase tracking-[0.2em] text-muted">Código da reserva</span>
        <strong className="mt-2 block text-xl tracking-[0.18em] text-primary">{reservation.publicCode}</strong>
      </div>
      <Link href={`/minha-reserva/${reservation.secureToken}`} className="mt-5 inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-primary bg-primary/10 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20">
        Acessar minha reserva <ArrowRight aria-hidden="true" size={16} />
      </Link>
      <MockPaymentDemo reservationId={reservation.reservationId} publicCode={reservation.publicCode} />
      <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover">
        Voltar ao site <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </motion.div>
  );
}

function StepIndicators({ currentStep }: { currentStep: number }) {
  return (
    <div className="reservation-stepper-container mx-auto mt-10 flex max-w-3xl items-center justify-between">
      {steps.map((label, index) => {
        const number = index + 1;
        const active = currentStep >= number;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted'}`}>{number}</span>
              <span className={`hidden text-[10px] uppercase tracking-[0.16em] sm:block ${active ? 'text-primary' : 'text-muted'}`}>{label}</span>
            </div>
            {number < steps.length && <span className={`mx-1.5 h-px flex-1 sm:mx-4 sm:w-20 sm:flex-none ${currentStep > number ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );
}

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
  setValue: UseFormSetValue<FormValues>;
  specialNeeds: string[];
  holdExpiresAt: number | null;
  onAuthenticated: () => Promise<boolean>;
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
  setValue,
  specialNeeds,
  holdExpiresAt,
  onAuthenticated,
}: WizardContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
        {step === 1 && <CustomerAuthStep onAuthenticated={onAuthenticated} />}
        {step === 2 && <StepDate register={register} errorDate={errors.date?.message} errorGuests={errors.guests?.message} />}
        {step === 3 && <StepAvailability date={date} guests={guests} slots={slots} isLoading={isLoading} hasError={hasError} selectedTime={selectedTime} selectedTableIds={selectedTableIds} setValue={setValue} errorTime={errors.time?.message} holdExpiresAt={holdExpiresAt} />}
        {step === 4 && <ReservationPreferencesStep register={register} setValue={setValue} selectedNeeds={specialNeeds} errors={errors} />}
      </motion.div>
    </AnimatePresence>
  );
}

type WizardActionProps = {
  step: number;
  canGoBack: boolean;
  isSubmitting: boolean;
  isAdvancing: boolean;
  isHolding: boolean;
  onBack: () => void;
  onNext: () => void;
};

function ContinueWizardAction({ canGoBack, isSubmitting, isAdvancing, isHolding, onBack, onNext }: WizardActionProps) {
  const isBusy = isSubmitting || isHolding || isAdvancing;
  const icon = isHolding || isAdvancing
    ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />
    : <ArrowRight aria-hidden="true" size={16} />;
  const label = isHolding ? 'Reservando...' : isAdvancing ? 'Verificando acesso...' : 'Continuar';
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
      {canGoBack ? <button type="button" onClick={onBack} disabled={isBusy} className="reservation-secondary-button disabled:cursor-not-allowed disabled:opacity-60"><ArrowLeft aria-hidden="true" size={16} /> Voltar</button> : <span />}
      <button type="button" onClick={onNext} disabled={isBusy} className="reservation-primary-button disabled:cursor-wait disabled:opacity-70">{icon} {label}</button>
    </div>
  );
}

function ConfirmWizardAction({ isSubmitting, isHolding, isAdvancing, canGoBack, onBack }: WizardActionProps) {
  const isBusy = isSubmitting || isHolding || isAdvancing;
  return <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">{canGoBack ? <button type="button" onClick={onBack} disabled={isBusy} className="reservation-secondary-button disabled:cursor-not-allowed disabled:opacity-60"><ArrowLeft aria-hidden="true" size={16} /> Voltar</button> : <span />}<button type="submit" disabled={isBusy} className="reservation-primary-button">{isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Check aria-hidden="true" size={16} />} {isSubmitting ? 'Enviando...' : 'Confirmar reserva'}</button></div>;
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
  user,
  onBack,
  onNext,
  handleSubmit,
  ...contentProps
}: ReservationFormProps) {
  const content = <WizardContent step={step} holdExpiresAt={holdExpiresAt} {...contentProps} />;
  if (step === 1) {
    return <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-sm sm:p-8">{content}</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-sm sm:p-8">
      {content}
      {step === 5 && <StepReview values={values} holdExpiresAt={holdExpiresAt} user={user} />}
      {submitError && <p className="mt-5 rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{submitError}</p>}
      <WizardActions step={step} canGoBack={canGoBack} isSubmitting={isSubmitting} isHolding={isHolding} isAdvancing={isAdvancing} onBack={onBack} onNext={onNext} />
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
  onBack: () => void;
  onNext: () => void;
  handleSubmit: ReturnType<typeof useForm<FormValues>>['handleSubmit'];
  user: ReservationUser | null;
  onAuthenticated: () => Promise<boolean>;
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
  onBack,
  onNext,
  handleSubmit,
  user,
  onAuthenticated,
}: ReservationShellProps) {
  return (
    <>
      <div className="reservation-header-container mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">The Wine Experience</p>
        <h1 className="mt-4 font-display text-5xl leading-none text-foreground sm:text-6xl">Reserve sua experiência</h1>
      </div>
      <StepIndicators currentStep={step} />
      <div className="reservation-card-grid mx-auto mt-10">
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
          onBack={onBack}
          onNext={onNext}
          handleSubmit={handleSubmit}
          user={user}
          onAuthenticated={onAuthenticated}
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
    return <main className="reservation-theme min-h-screen bg-background px-5 py-24 text-foreground"><p className="mx-auto flex max-w-md items-center justify-center gap-3 text-sm text-muted" role="status"><LoaderCircle aria-hidden="true" className="animate-spin text-primary" size={18} /> Verificando seu acesso…</p></main>;
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
    <main className="reservation-theme reservation-page-wrapper min-h-screen bg-background font-sans text-foreground">
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        {confirmation ? <Confirmation reservation={confirmation} /> : <ReservationShell {...shellProps} />}
      </section>
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
  const {
    register,
    handleSubmit,
    trigger,
    control,
    setValue,
    reset: resetForm,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(authenticatedPublicReservationSchema),
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
  const selectionKey = [date, guests, duration, time, tableIds.join(',')].join('|');
  const holdExpiresAt = hold?.selectionKey === selectionKey ? hold.expiresAt : null;
  const availabilityQuery = useQuery({
    queryKey: ['reservation-availability', date, guests, duration],
    queryFn: () => fetchAvailability(date, guests, duration),
    enabled: Boolean(date) && Number.isInteger(guests) && guests > 0,
  });
  const acceptAuthenticatedFlow = useCallback((nextUser: ReservationUser, nextFlowId: string) => {
    setUser(nextUser);
    startAuthenticatedFlow(nextFlowId);
    setValue('flowId', nextFlowId, { shouldDirty: false, shouldValidate: false });
    setSubmitError('');
    setAuthError('');
    setAuthState('ready');
  }, [setValue, startAuthenticatedFlow]);

  const redirectAfterSessionLoss = useCallback((reason: 'expired' | 'changed') => {
    resetWizard();
    resetForm(defaultReservationValues);
    setUser(null);
    setHold(null);
    router.replace(`/?auth=${reason}`);
  }, [resetForm, resetWizard, router]);

  const onAuthenticated = useCallback(async () => {
    const result = await requestSessionFlow();
    if (result.kind === 'authenticated') {
      acceptAuthenticatedFlow(result.user, result.flowId);
      return true;
    }
    if (result.kind === 'error' && (result.error === 'session_expired' || result.error === 'account_changed')) {
      redirectAfterSessionLoss(result.error === 'account_changed' ? 'changed' : 'expired');
    }
    return false;
  }, [acceptAuthenticatedFlow, redirectAfterSessionLoss]);

  useEffect(() => {
    let active = true;
    resetWizard();
    resetForm(defaultReservationValues);

    void requestSessionFlow().then((result) => {
      if (!active) return;
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
      acceptAuthenticatedFlow(result.user, result.flowId);
    });

    return () => {
      active = false;
      resetWizard();
    };
  }, [acceptAuthenticatedFlow, redirectAfterSessionLoss, resetForm, resetWizard, setStep]);

  const invalidateSession = (reason: 'expired' | 'changed') => {
    redirectAfterSessionLoss(reason);
  };

  const createHold = async (): Promise<boolean> => {
    if (holdLock.current) return false;
    if (!date || !time || tableIds.length === 0) {
      setSubmitError('Escolha um horário e uma mesa antes de continuar.');
      return false;
    }

    holdLock.current = true;
    setSubmitError('');
    setIsHolding(true);
    try {
      const response = await fetch('/api/reservations/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time, guests, duration, tableIds }),
      });
      if (!response.ok) {
        setSubmitError(response.status === 409
          ? 'Esse horário acabou de ser ocupado. Escolha outro horário, por favor.'
          : 'Não foi possível reservar a mesa agora. Tente novamente em instantes.');
        return false;
      }
      const hold = await response.json() as CreatedReservationHold;
      setHold({ selectionKey, expiresAt: hold.expiresAt });
      return true;
    } catch {
      setSubmitError('Não foi possível reservar a mesa agora. Tente novamente em instantes.');
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
  const retryInitialization = async () => {
    setAuthState('checking');
    const result = await requestSessionFlow();
    if (result.kind === 'authenticated') {
      acceptAuthenticatedFlow(result.user, result.flowId);
      return;
    }
    if (result.kind === 'anonymous') {
      setUser(null);
      setStep(1);
      setAuthState('ready');
      return;
    }
    if (result.error === 'session_expired' || result.error === 'account_changed') {
      redirectAfterSessionLoss(result.error === 'account_changed' ? 'changed' : 'expired');
      return;
    }
    setAuthError(result.message);
    setAuthState('error');
  };

  const submit = async (input: FormValues) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitError('');
    try {
      const result = await submitAuthenticatedReservation(input);
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
        setValue('flowId', result.flowId, { shouldDirty: false, shouldValidate: false });
        setSubmitError('O acesso à reserva foi renovado. Confira os detalhes e confirme novamente.');
        return;
      }
      if (result.status === 409) setHold(null);
      setSubmitError(reservationErrorMessage(result.error, result.message));
    } finally {
      submitLock.current = false;
    }
  };

  return (
    <ReservationWizardContent
      authState={authState}
      authError={authError}
      onRetry={() => { void retryInitialization(); }}
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
        onAuthenticated,
        onSubmit: submit,
        onBack: goBack,
        onNext: goNext,
        handleSubmit,
      }}
    />
  );
}
