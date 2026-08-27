'use client';

import { Clock3, LoaderCircle, Mail, Plus, Phone, StickyNote, UserRound, UsersRound, X, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { formatPhoneInput } from '@/lib/phone';
import { adminWalkInSchema } from '@/modules/admin/schemas/admin-schema';

type Props = { date: string; onCreated: () => void };
type FieldName = 'time' | 'duration' | 'guests' | 'name' | 'phone' | 'email' | 'notes';
type FieldErrors = Partial<Record<FieldName, string>>;
type InputIcon = LucideIcon;

function dateLabel(value: string): string {
  return value.split('-').reverse().join('/');
}

function fieldErrorMap(issues: Array<{ path: PropertyKey[]; message: string }>): FieldErrors {
  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = String(issue.path[0]) as FieldName;
    if (field in errors) return errors;
    if (['time', 'duration', 'guests', 'name', 'phone', 'email', 'notes'].includes(field)) errors[field] = issue.message;
    return errors;
  }, {});
}

function WalkInField({
  label,
  name,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  name: FieldName;
  icon: InputIcon;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = `${name}-error`;
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon aria-hidden="true" size={14} className="text-primary" />
        {label}
      </span>
      {children}
      {error && <span id={errorId} role="alert" className="mt-1.5 block text-xs text-status-danger">{error}</span>}
    </label>
  );
}

function inputProps(name: FieldName, error?: string): Pick<InputHTMLAttributes<HTMLInputElement>, 'aria-invalid' | 'aria-describedby'> {
  return {
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? `${name}-error` : undefined,
  };
}

function walkInInput(date: string, form: FormData) {
  return {
    date,
    time: String(form.get('time') ?? ''),
    duration: Number(form.get('duration')),
    guests: Number(form.get('guests')),
    name: String(form.get('name') ?? ''),
    phone: String(form.get('phone') ?? ''),
    email: String(form.get('email') ?? ''),
    notes: String(form.get('notes') ?? ''),
    tableIds: [],
  };
}

async function saveWalkIn(input: unknown): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch('/api/admin/reservations/walk-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (response.ok) return { ok: true, message: 'Atendimento presencial registrado com sucesso.' };
    return { ok: false, message: response.status === 409 ? 'Não há disponibilidade para os dados informados.' : 'Não foi possível registrar o atendimento presencial.' };
  } catch {
    return { ok: false, message: 'Não foi possível conectar ao servidor.' };
  }
}

export function AdminWalkInForm({ date, onCreated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [phone, setPhone] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const parsed = adminWalkInSchema.safeParse(walkInInput(date, new FormData(formElement)));
    setMessage('');
    setError(false);
    setFieldErrors({});
    if (!parsed.success) {
      setError(true);
      setFieldErrors(fieldErrorMap(parsed.error.issues));
      setMessage('Confira os campos destacados antes de registrar.');
      return;
    }

    setIsSaving(true);
    const result = await saveWalkIn(parsed.data);
    setError(!result.ok);
    setMessage(result.message);
    setIsSaving(false);
    if (!result.ok) return;
    formElement.reset();
    setPhone('');
    setIsOpen(false);
    onCreated();
  };

  const toggle = () => {
    setIsOpen((value) => !value);
    setMessage('');
    setError(false);
    setFieldErrors({});
  };

  return (
    <section className="mt-6 rounded-[var(--radius-md)] border border-primary/20 bg-primary/5 p-4 sm:p-5" aria-labelledby="walk-in-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Operação rápida</p>
          <h2 id="walk-in-title" className="mt-1 font-display text-2xl text-foreground">Atendimento presencial</h2>
          <p className="mt-1 text-xs text-muted">Registre uma chegada sem reserva para a agenda de hoje.</p>
        </div>
        <button type="button" onClick={toggle} className="admin-primary-button" aria-expanded={isOpen} aria-controls="walk-in-form">
          {isOpen ? <X aria-hidden="true" size={16} /> : <Plus aria-hidden="true" size={16} />}
          {isOpen ? 'Fechar' : 'Novo atendimento'}
        </button>
      </div>
      {isOpen && (
        <form id="walk-in-form" onSubmit={submit} className="mt-5 grid gap-4 border-t border-primary/20 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[var(--radius-sm)] border border-primary/20 bg-surface-muted px-3 py-2.5 sm:col-span-2 xl:col-span-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><Clock3 aria-hidden="true" size={14} className="text-primary" /> Agenda</span>
            <p className="mt-1 text-sm text-muted">{dateLabel(date)}</p>
          </div>
          <WalkInField label="Horário" name="time" icon={Clock3} error={fieldErrors.time}>
            <input name="time" type="time" defaultValue="19:00" required className="admin-input" {...inputProps('time', fieldErrors.time)} />
          </WalkInField>
          <WalkInField label="Duração (minutos)" name="duration" icon={Clock3} error={fieldErrors.duration}>
            <input name="duration" type="number" min="15" max="720" step="15" defaultValue="120" required className="admin-input" {...inputProps('duration', fieldErrors.duration)} />
          </WalkInField>
          <WalkInField label="Pessoas" name="guests" icon={UsersRound} error={fieldErrors.guests}>
            <input name="guests" type="number" min="1" max="20" defaultValue="2" required className="admin-input" {...inputProps('guests', fieldErrors.guests)} />
          </WalkInField>
          <WalkInField label="Nome completo" name="name" icon={UserRound} error={fieldErrors.name}>
            <input name="name" type="text" maxLength={160} required autoComplete="name" placeholder="Como podemos chamar?" className="admin-input" {...inputProps('name', fieldErrors.name)} />
          </WalkInField>
          <WalkInField label="Telefone" name="phone" icon={Phone} error={fieldErrors.phone}>
            <input name="phone" type="tel" value={phone} onChange={(event) => setPhone(formatPhoneInput(event.target.value))} maxLength={18} required inputMode="tel" autoComplete="tel" placeholder="(91) 99999-9999" className="admin-input" {...inputProps('phone', fieldErrors.phone)} />
          </WalkInField>
          <WalkInField label="E-mail (opcional)" name="email" icon={Mail} error={fieldErrors.email}>
            <input name="email" type="email" maxLength={254} autoComplete="email" placeholder="voce@email.com" className="admin-input" {...inputProps('email', fieldErrors.email)} />
          </WalkInField>
          <WalkInField label="Observações (opcional)" name="notes" icon={StickyNote} error={fieldErrors.notes}>
            <input name="notes" type="text" maxLength={500} placeholder="Preferências ou informações importantes" className="admin-input" {...inputProps('notes', fieldErrors.notes)} />
          </WalkInField>
          <div className="flex items-end justify-end sm:col-span-2 xl:col-span-4">
            <button type="submit" disabled={isSaving} className="admin-primary-button min-w-48">
              {isSaving && <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />}
              Registrar chegada
            </button>
          </div>
        </form>
      )}
      {message && <p role={error ? 'alert' : 'status'} className={`mt-3 text-sm ${error ? 'text-status-danger' : 'text-status-success'}`}>{message}</p>}
    </section>
  );
}
