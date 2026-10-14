'use client';

import { useRef, type ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { AuthenticatedPublicReservationInput } from '@/modules/reservations/schemas/public-reservation-schema';

type ReservationPreferencesStepProps = {
  register: UseFormRegister<AuthenticatedPublicReservationInput>;
  setValue: UseFormSetValue<AuthenticatedPublicReservationInput>;
  selectedNeeds: string[];
  errors: FieldErrors<AuthenticatedPublicReservationInput>;
};

const specialNeedOptions = [
  ['accessibility', 'Acessibilidade'],
  ['reduced_mobility', 'Mobilidade reduzida'],
  ['high_chair', 'Cadeira infantil'],
  ['dietary_restriction', 'Restrição alimentar'],
  ['food_allergy', 'Alergia alimentar'],
  ['other', 'Outra necessidade'],
  ['none', 'Nenhuma'],
] as const;

export function ReservationPreferencesStep({ register, setValue, selectedNeeds, errors }: ReservationPreferencesStepProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const notesRegistration = register('notes');
  const isOtherSelected = selectedNeeds.includes('other');

  const changeNeed = (code: string, checked: boolean) => {
    const next = checked
      ? code === 'none'
        ? ['none']
        : [...selectedNeeds.filter((need) => need !== 'none'), code]
      : selectedNeeds.filter((need) => need !== code);
    setValue('specialNeeds', next as AuthenticatedPublicReservationInput['specialNeeds'], {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    if (code === 'other' && checked) window.requestAnimationFrame(() => notesRef.current?.focus());
  };

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold tracking-wide text-foreground">Necessidades especiais <span className="font-normal text-muted">(opcional)</span></legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {specialNeedOptions.map(([code, label]) => (
            <label key={code} className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-3 text-sm text-muted transition hover:border-primary focus-within:border-primary">
              <input
                type="checkbox"
                value={code}
                checked={selectedNeeds.includes(code)}
                onChange={(event: ChangeEvent<HTMLInputElement>) => changeNeed(code, event.target.checked)}
                className="reservation-checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Escolha “Nenhuma” ou uma ou mais necessidades específicas.</p>
      </fieldset>
      <label htmlFor="reservation-notes" className="block">
        <span className="mb-2 block text-sm font-semibold tracking-wide text-foreground">Observações <span className="font-normal text-muted">(opcional)</span></span>
        <textarea
          {...notesRegistration}
          ref={(node) => {
            notesRegistration.ref(node);
            notesRef.current = node;
          }}
          id="reservation-notes"
          maxLength={500}
          className="reservation-input min-h-32"
          placeholder={isOtherSelected ? 'Quais outras necessidades e observações você tem?' : 'Aniversário, comemoração ou algum pedido especial?'}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? 'reservation-notes-error' : 'reservation-notes-count'}
        />
        {errors.notes?.message
          ? <p id="reservation-notes-error" className="mt-1.5 text-sm text-status-danger">{errors.notes.message}</p>
          : <p id="reservation-notes-count" className="mt-1.5 text-right text-xs text-muted">Até 500 caracteres</p>}
      </label>
    </div>
  );
}
