'use client';

import { BellRing, Check, LoaderCircle, Mail, Phone, UserRound } from 'lucide-react';
import { useState } from 'react';
import { formatPhoneInput } from '@/lib/phone';
import { publicWaitlistSchema } from '@/modules/reservations/schemas/public-reservation-schema';

type WaitlistFormState = 'idle' | 'submitting' | 'success' | 'error';
type WaitlistFields = { name: string; phone: string; email: string; preferredTime: string; notes: string };
type WaitlistField = keyof WaitlistFields;
type WaitlistErrors = Partial<Record<WaitlistField, string>>;

const preferredTimes = ['12:00', '12:30', '13:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];

function emptyFields(): WaitlistFields {
  return { name: '', phone: '', email: '', preferredTime: '', notes: '' };
}

function validateFields(fields: WaitlistFields, date: string, guests: number): WaitlistErrors {
  const result = publicWaitlistSchema.safeParse({
    date,
    guests,
    ...fields,
    preferredTime: fields.preferredTime || null,
  });
  if (result.success) return {};

  return result.error.issues.reduce<WaitlistErrors>((errors, issue) => {
    const field = issue.path[0] as WaitlistField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-1 text-xs text-status-danger">{message}</p> : null;
}

function WaitlistFieldInputs({
  fields,
  errors,
  setField,
}: {
  fields: WaitlistFields;
  errors: WaitlistErrors;
  setField: (field: WaitlistField, value: string) => void;
}) {
  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted"><UserRound aria-hidden="true" size={14} /> Nome</span><input id="waitlist-name" value={fields.name} onChange={(event) => setField('name', event.target.value)} aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'waitlist-name-error' : undefined} className="reservation-input" placeholder="Seu nome" /> <FieldError id="waitlist-name-error" message={errors.name} /></label>
        <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted"><Phone aria-hidden="true" size={14} /> Telefone</span><input id="waitlist-phone" value={fields.phone} onChange={(event) => setField('phone', formatPhoneInput(event.target.value))} aria-required="true" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'waitlist-phone-error' : undefined} className="reservation-input" placeholder="(91) 99999-9999" inputMode="tel" autoComplete="tel" maxLength={18} /> <FieldError id="waitlist-phone-error" message={errors.phone} /></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-muted"><Mail aria-hidden="true" size={14} /> E-mail</span><input id="waitlist-email" value={fields.email} onChange={(event) => setField('email', event.target.value)} type="email" aria-required="true" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'waitlist-email-error' : undefined} className="reservation-input" placeholder="voce@email.com" /> <FieldError id="waitlist-email-error" message={errors.email} /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">Preferência de horário</span><select id="waitlist-preferred-time" value={fields.preferredTime} onChange={(event) => setField('preferredTime', event.target.value)} aria-invalid={Boolean(errors.preferredTime)} aria-describedby={errors.preferredTime ? 'waitlist-preferred-time-error' : undefined} className="reservation-input"><option value="">Qualquer horário</option>{preferredTimes.map((time) => <option key={time} value={time}>{time}</option>)}</select> <FieldError id="waitlist-preferred-time-error" message={errors.preferredTime} /></label>
      </div>
      <label className="mt-3 block"><span className="mb-1.5 block text-xs font-semibold text-muted">Observações (opcional)</span><textarea id="waitlist-notes" value={fields.notes} onChange={(event) => setField('notes', event.target.value)} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'waitlist-notes-error' : undefined} className="reservation-input min-h-20" placeholder="Algum detalhe para nossa equipe?" /> <FieldError id="waitlist-notes-error" message={errors.notes} /></label>
    </>
  );
}

function WaitlistFeedback({ state, hasErrors }: { state: WaitlistFormState; hasErrors: boolean }) {
  if (hasErrors) return <p role="alert" className="mt-3 text-xs text-status-danger">Corrija os campos destacados antes de enviar o pedido.</p>;
  if (state === 'error') return <p role="alert" className="mt-3 text-xs text-status-danger">Não foi possível registrar seu pedido agora. Tente novamente em instantes.</p>;
  return null;
}

function WaitlistSubmitButton({ state, onClick }: { state: WaitlistFormState; onClick: () => void | Promise<void> }) {
  const isSubmitting = state === 'submitting';
  return <button type="button" onClick={() => onClick()} disabled={isSubmitting} className="reservation-primary-button mt-4 disabled:cursor-wait disabled:opacity-70">{isSubmitting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <BellRing aria-hidden="true" size={16} />} {isSubmitting ? 'Registrando...' : 'Entrar na lista de espera'}</button>;
}

async function createWaitlistEntry(input: WaitlistFields & { date: string; guests: number }): Promise<{ referenceCode: string }> {
  const response = await fetch('/api/reservations/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, preferredTime: input.preferredTime || null }),
  });
  if (!response.ok) throw new Error('waitlist_unavailable');
  return response.json() as Promise<{ referenceCode: string }>;
}

export function WaitlistForm({ date, guests }: { date: string; guests: number }) {
  const [state, setState] = useState<WaitlistFormState>('idle');
  const [referenceCode, setReferenceCode] = useState('');
  const [fields, setFields] = useState<WaitlistFields>(emptyFields);
  const [errors, setErrors] = useState<WaitlistErrors>({});
  const hasErrors = Object.keys(errors).length > 0;

  const setField = (field: WaitlistField, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const submit = async () => {
    const validationErrors = validateFields(fields, date, guests);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setState('idle');
      return;
    }

    setState('submitting');
    try {
      const result = await createWaitlistEntry({ date, guests, ...fields });
      setReferenceCode(result.referenceCode);
      setFields(emptyFields());
      setErrors({});
      setState('success');
    } catch {
      setState('error');
    }
  };

  if (state === 'success') {
    return <div className="mt-5 rounded-[var(--radius-md)] border border-status-success/30 bg-status-success/10 p-4 text-sm text-status-success" role="status"><div className="flex items-center gap-2 font-semibold"><Check aria-hidden="true" size={18} /> Pedido registrado na lista de espera.</div><p className="mt-2 text-xs leading-relaxed">Guarde a referência <strong>{referenceCode}</strong>. Nossa equipe poderá avisar você quando surgir uma mesa.</p><button type="button" onClick={() => setState('idle')} className="mt-3 text-xs font-semibold underline underline-offset-4">Registrar outro pedido</button></div>;
  }

  return (
    <div className="mt-5 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4 text-left" role="form" aria-labelledby="waitlist-title">
      <div className="flex items-start gap-3"><BellRing aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={19} /><div><h3 id="waitlist-title" className="text-sm font-semibold text-foreground">Entre na lista de espera</h3><p className="mt-1 text-xs leading-relaxed text-muted">Avise nossa equipe sobre a data e entraremos em contato se uma mesa ficar disponível.</p></div></div>
      <WaitlistFieldInputs fields={fields} errors={errors} setField={setField} />
      <WaitlistFeedback state={state} hasErrors={hasErrors} />
      <WaitlistSubmitButton state={state} onClick={submit} />
    </div>
  );
}
