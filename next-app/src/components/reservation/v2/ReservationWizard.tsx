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
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm, useWatch, type FieldErrors, type FieldPath, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
import { whatsappLinks } from '@/config/social';
import {
  publicReservationSchema,
  specialNeedCodes,
  type PublicReservationInput,
} from '@/modules/reservations/schemas/public-reservation-schema';
import { useReservationWizardStore } from './useReservationWizardStore';

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
  status: string;
};

type CreatedReservationHold = {
  holdId: number;
  tableIds: number[];
  expiresAt: number;
};

type FormValues = PublicReservationInput;

const specialNeedOptions = [
  ['accessibility', 'Acessibilidade'],
  ['reduced_mobility', 'Mobilidade reduzida'],
  ['high_chair', 'Cadeira infantil'],
  ['dietary_restriction', 'Restrição alimentar'],
  ['food_allergy', 'Alergia alimentar'],
  ['other', 'Outra necessidade'],
  ['none', 'Nenhuma'],
] as const;

const steps = ['Data', 'Horário', 'Seus dados', 'Confirmação'];

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
    <div className="grid gap-5 sm:grid-cols-2">
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
  slots,
  isLoading,
  hasError,
  selectedTime,
  selectedTableIds,
  setValue,
  errorTime,
  holdExpiresAt,
}: {
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
    return <EmptyAvailability label="Não foi possível consultar a disponibilidade agora." />;
  }
  if (slots.length === 0) {
    return <EmptyAvailability label="Ainda não há horários configurados para esta data." />;
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
                  <span className="flex items-center gap-2">
                    <Sparkles aria-hidden="true" size={16} />
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

function EmptyAvailability({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface-muted/40 p-6">
      <div className="flex items-start gap-3 text-sm text-muted">
        <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={19} />
        <span>{label} <a className="text-primary underline underline-offset-4" href={whatsappLinks.reservation}>Fale com nossa equipe pelo WhatsApp.</a></span>
      </div>
    </div>
  );
}

function StepCustomer({
  register,
  selectedNeeds,
  errors,
}: {
  register: UseFormRegister<FormValues>;
  selectedNeeds: string[];
  errors: Record<string, { message?: string } | undefined>;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Nome completo" icon={Users}>
          <input {...register('name')} className="reservation-input" placeholder="Como podemos chamar você?" />
          <FieldError message={errors.name?.message} />
        </FormField>
        <FormField label="Telefone" icon={Phone}>
          <input {...register('phone')} className="reservation-input" placeholder="(91) 99999-9999" inputMode="tel" />
          <FieldError message={errors.phone?.message} />
        </FormField>
      </div>
      <FormField label="E-mail" icon={Mail}>
        <input {...register('email')} type="email" className="reservation-input" placeholder="voce@email.com" />
        <FieldError message={errors.email?.message} />
      </FormField>
      <div>
        <p className="mb-3 text-sm font-semibold tracking-wide text-foreground">Necessidades especiais</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {specialNeedOptions.map(([code, label]) => (
            <label key={code} className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-3 text-sm text-muted transition hover:border-primary">
              <input {...register('specialNeeds')} type="checkbox" value={code} className="reservation-checkbox" />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {selectedNeeds.includes('other') && (
          <textarea {...register('specialNeedsOther')} className="reservation-input mt-3 min-h-24" placeholder="Conte um pouco mais para prepararmos tudo com carinho." />
        )}
        <FieldError message={errors.specialNeedsOther?.message} />
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold tracking-wide text-foreground">Observações</span>
        <textarea {...register('notes')} className="reservation-input min-h-28" placeholder="Aniversário, comemoração ou algum pedido especial?" />
        <FieldError message={errors.notes?.message} />
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input {...register('marketingConsent')} type="checkbox" className="reservation-checkbox mt-0.5" />
        <span>Quero receber novidades e experiências do The Wine.</span>
      </label>
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

function StepReview({ values, holdExpiresAt }: { values: FormValues; holdExpiresAt: number | null }) {
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
      <SummaryItem label="Contato" value={`${values.name} · ${values.phone}`} />
      {holdExpiresAt && <p role="status" className="mt-5 rounded-[var(--radius-sm)] border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-primary">Mesa mantida até {formatHoldExpiry(holdExpiresAt)}. A confirmação precisa ser concluída antes desse horário.</p>}
      <p className="mt-5 text-xs leading-relaxed text-muted">Esta é uma reserva sem pagamento. Nossa equipe poderá entrar em contato para confirmar algum detalhe da experiência.</p>
    </div>
  );
}

function Confirmation({ reservation }: { reservation: CreatedReservation }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check aria-hidden="true" size={28} strokeWidth={2.2} />
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-primary">Reserva recebida</p>
      <h2 className="mt-3 font-display text-4xl text-foreground">Sua experiência está a caminho.</h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">Anotamos sua reserva. Guarde o código abaixo para falar com nossa equipe.</p>
      <div className="mt-7 rounded-[var(--radius-md)] border border-border bg-surface-muted p-4">
        <span className="block text-xs uppercase tracking-[0.2em] text-muted">Código da reserva</span>
        <strong className="mt-2 block text-xl tracking-[0.18em] text-primary">{reservation.publicCode}</strong>
      </div>
      <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover">
        Voltar ao site <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </motion.div>
  );
}

function StepIndicators({ currentStep }: { currentStep: number }) {
  return (
    <div className="mx-auto mt-10 flex max-w-3xl items-center justify-between">
      {steps.map((label, index) => {
        const number = index + 1;
        const active = currentStep >= number;
        return (
          <div key={label} className="flex items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted'}`}>{number}</span>
              <span className={`hidden text-[10px] uppercase tracking-[0.16em] sm:block ${active ? 'text-primary' : 'text-muted'}`}>{label}</span>
            </div>
            {number < steps.length && <span className={`mx-2 h-px w-8 sm:mx-4 sm:w-20 ${currentStep > number ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );
}

type WizardContentProps = {
  step: number;
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
};

function WizardContent({
  step,
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
}: WizardContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
        {step === 1 && <StepDate register={register} errorDate={errors.date?.message} errorGuests={errors.guests?.message} />}
        {step === 2 && <StepAvailability slots={slots} isLoading={isLoading} hasError={hasError} selectedTime={selectedTime} selectedTableIds={selectedTableIds} setValue={setValue} errorTime={errors.time?.message} holdExpiresAt={holdExpiresAt} />}
        {step === 3 && <StepCustomer register={register} selectedNeeds={specialNeeds} errors={errors as Record<string, { message?: string } | undefined>} />}
      </motion.div>
    </AnimatePresence>
  );
}

function WizardActions({
  step,
  isSubmitting,
  isHolding,
  onBack,
  onNext,
}: {
  step: number;
  isSubmitting: boolean;
  isHolding: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const isBusy = isSubmitting || isHolding;
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
      {step > 1 ? <button type="button" onClick={onBack} className="reservation-secondary-button"><ArrowLeft aria-hidden="true" size={16} /> Voltar</button> : <span />}
      {step < 4 ? <button type="button" onClick={onNext} disabled={isBusy} className="reservation-primary-button disabled:cursor-wait disabled:opacity-70">{isHolding ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <ArrowRight aria-hidden="true" size={16} />} {isHolding ? 'Reservando...' : 'Continuar'}</button> : <button type="submit" disabled={isBusy} className="reservation-primary-button">{isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Check aria-hidden="true" size={16} />} {isSubmitting ? 'Enviando...' : 'Confirmar reserva'}</button>}
    </div>
  );
}

type ReservationFormProps = Omit<WizardContentProps, 'step'> & {
  step: number;
  values: FormValues;
  holdExpiresAt: number | null;
  submitError: string;
  isHolding: boolean;
  isSubmitting: boolean;
  onSubmit: (values: FormValues) => Promise<void>;
  onBack: () => void;
  onNext: () => void;
  handleSubmit: ReturnType<typeof useForm<FormValues>>['handleSubmit'];
};

function ReservationForm({
  step,
  values,
  holdExpiresAt,
  submitError,
  isHolding,
  isSubmitting,
  onSubmit,
  onBack,
  onNext,
  handleSubmit,
  ...contentProps
}: ReservationFormProps) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-sm sm:p-8">
      <WizardContent step={step} holdExpiresAt={holdExpiresAt} {...contentProps} />
      {step === 4 && <StepReview values={values} holdExpiresAt={holdExpiresAt} />}
      {submitError && <p className="mt-5 rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{submitError}</p>}
      <WizardActions step={step} isSubmitting={isSubmitting} isHolding={isHolding} onBack={onBack} onNext={onNext} />
    </form>
  );
}

type ReservationShellProps = {
  step: number;
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
  onSubmit: (values: FormValues) => Promise<void>;
  onBack: () => void;
  onNext: () => void;
  handleSubmit: ReturnType<typeof useForm<FormValues>>['handleSubmit'];
};

function ReservationShell({
  step,
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
  onSubmit,
  onBack,
  onNext,
  handleSubmit,
}: ReservationShellProps) {
  return (
    <>
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">The Wine Experience</p>
        <h1 className="mt-4 font-display text-5xl leading-none text-foreground sm:text-6xl">Reserve sua experiência</h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted sm:text-base">Escolha o melhor momento para viver uma noite especial no mezanino do +B Supermercados.</p>
      </div>
      <StepIndicators currentStep={step} />
      <div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <ReservationForm
          step={step}
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
          onSubmit={onSubmit}
          onBack={onBack}
          onNext={onNext}
          handleSubmit={handleSubmit}
        />
        <aside className="hidden h-fit rounded-[var(--radius-lg)] border border-border bg-surface p-6 lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The Wine</p>
          <h2 className="mt-3 font-display text-3xl text-foreground">Uma noite para lembrar.</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">Av. Alcindo Cacela, 1848 · Nazaré · Belém – PA</p>
          <div className="mt-6 space-y-3 border-t border-border pt-5 text-sm text-muted">
            <p className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={16} /> Mezanino do +B Supermercados</p>
            <p className="flex items-start gap-2"><Clock3 aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={16} /> Segunda a sábado, 12h–15h e 19h–23h</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function ReservationHeader() {
  return (
    <header className="border-b border-border bg-surface/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm tracking-[0.18em] text-primary">
          <span className="font-display text-2xl tracking-normal">THE WINE</span>
          <span className="hidden text-[10px] uppercase text-muted sm:inline">Experience</span>
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted transition hover:text-primary">
          <ArrowLeft aria-hidden="true" size={15} /> Voltar ao site
        </Link>
      </div>
    </header>
  );
}

export function ReservationWizard() {
  const step = useReservationWizardStore((state) => state.step);
  const setStep = useReservationWizardStore((state) => state.setStep);
  const resetStep = useReservationWizardStore((state) => state.reset);
  const [confirmation, setConfirmation] = useState<CreatedReservation | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [hold, setHold] = useState<{ selectionKey: string; expiresAt: number } | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const {
    register,
    handleSubmit,
    trigger,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(publicReservationSchema),
    defaultValues: {
      date: '',
      time: '',
      guests: 0,
      duration: 120,
      tableIds: [],
      name: '',
      phone: '',
      email: '',
      specialNeeds: [],
      specialNeedsOther: '',
      notes: '',
      marketingConsent: false,
    },
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
  useEffect(() => () => resetStep(), [resetStep]);

  const createHold = async (): Promise<boolean> => {
    if (!date || !time || tableIds.length === 0) {
      setSubmitError('Escolha um horário e uma mesa antes de continuar.');
      return false;
    }

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
      setIsHolding(false);
    }
  };

  const goNext = async () => {
    const fields: FieldPath<FormValues>[] = step === 1
      ? ['date', 'guests']
      : step === 2
        ? ['time']
        : ['name', 'phone', 'email', 'specialNeedsOther', 'notes'];
    if (!(await trigger(fields))) return;
    if (step === 2 && !(await createHold())) return;
    setStep(Math.min(4, step + 1));
  };
  const goBack = () => setStep(Math.max(1, step - 1));
  const submit = async (input: FormValues) => {
    setSubmitError('');
    const response = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      if (response.status === 409) setHold(null);
      setSubmitError(response.status === 409
        ? 'Esse horário acabou de ser ocupado. Escolha outro horário, por favor.'
        : 'Não foi possível concluir agora. Tente novamente em instantes.');
      return;
    }
    setConfirmation(await response.json());
    setStep(5);
  };

  return (
    <main className="reservation-theme min-h-screen bg-background font-sans text-foreground">
      <ReservationHeader />

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
        {confirmation ? <Confirmation reservation={confirmation} /> : <ReservationShell
          step={step}
          register={register}
          errors={errors}
          slots={availabilityQuery.data?.slots ?? []}
          isLoading={availabilityQuery.isLoading}
          hasError={availabilityQuery.isError}
          selectedTime={time}
          selectedTableIds={tableIds}
          setValue={setValue}
          specialNeeds={specialNeeds}
          holdExpiresAt={holdExpiresAt}
          values={values}
          submitError={submitError}
          isHolding={isHolding}
          isSubmitting={isSubmitting}
          onSubmit={submit}
          onBack={goBack}
          onNext={goNext}
          handleSubmit={handleSubmit}
        />}
      </section>
    </main>
  );
}
