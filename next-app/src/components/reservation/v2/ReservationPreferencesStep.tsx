'use client';

import { Accessibility, Baby, FileText, HeartPulse, PersonStanding, SlidersHorizontal, UtensilsCrossed } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { AuthenticatedPublicReservationInput } from '@/modules/reservations/schemas/public-reservation-schema';

type ReservationPreferencesStepProps = { register: UseFormRegister<AuthenticatedPublicReservationInput>; setValue: UseFormSetValue<AuthenticatedPublicReservationInput>; selectedNeeds: string[]; notes: string; errors: FieldErrors<AuthenticatedPublicReservationInput> };
const specialNeedOptions = [
  ['accessibility', 'Acessibilidade', Accessibility],
  ['high_chair', 'Cadeira infantil', Baby],
  ['dietary_restriction', 'Restrição alimentar', UtensilsCrossed],
  ['food_allergy', 'Alergia alimentar', HeartPulse],
  ['reduced_mobility', 'Mobilidade reduzida', PersonStanding],
  ['other', 'Outra necessidade', SlidersHorizontal],
] as const;

export function ReservationPreferencesStep({ register, setValue, selectedNeeds, notes, errors }: ReservationPreferencesStepProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const notesRegistration = register('notes');
  const isOtherSelected = selectedNeeds.includes('other');
  const changeNeed = (code: string, checked: boolean) => {
    const next = checked ? [...selectedNeeds, code] : selectedNeeds.filter((need) => need !== code);
    setValue('specialNeeds', next as AuthenticatedPublicReservationInput['specialNeeds'], { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    if (code === 'other' && checked) window.requestAnimationFrame(() => notesRef.current?.focus());
  };
  return <div className="reservation-preferences-step">
    <div className="reservation-step-heading"><SlidersHorizontal aria-hidden="true" size={24} /><div><h2>Necessidades especiais <span className="reservation-optional">(opcional)</span></h2><p>Conte-nos se houver algo que possamos preparar para receber você melhor.</p></div></div>
    <fieldset className="reservation-preferences-fieldset"><legend className="sr-only">Necessidades especiais</legend><div className="reservation-preferences-grid">
      {specialNeedOptions.map(([code, label, Icon]) => <label key={code} className={`reservation-preference-card ${selectedNeeds.includes(code) ? 'reservation-preference-card-selected' : ''}`}><input type="checkbox" value={code} checked={selectedNeeds.includes(code)} onChange={(event: ChangeEvent<HTMLInputElement>) => changeNeed(code, event.target.checked)} className="reservation-preference-checkbox" /><Icon aria-hidden="true" size={24} strokeWidth={1.5} /><span>{label}</span></label>)}
    </div></fieldset>
    <label htmlFor="reservation-notes" className="reservation-notes-field"><span className="reservation-notes-label"><FileText aria-hidden="true" size={20} />Observações <span className="reservation-optional">(opcional)</span></span>
      <textarea {...notesRegistration} ref={(node) => { notesRegistration.ref(node); notesRef.current = node; }} id="reservation-notes" maxLength={500} className="reservation-notes-input" placeholder={isOtherSelected ? 'Quais outras necessidades e observações você tem?' : 'Aniversário, comemoração ou algum pedido especial?'} aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'reservation-notes-error' : 'reservation-notes-count'} />
      <span id={errors.notes ? 'reservation-notes-error' : 'reservation-notes-count'} className={errors.notes ? 'reservation-field-error' : 'reservation-notes-count'}>{errors.notes?.message ?? `${notes.length}/500 caracteres`}</span>
    </label>
  </div>;
}
