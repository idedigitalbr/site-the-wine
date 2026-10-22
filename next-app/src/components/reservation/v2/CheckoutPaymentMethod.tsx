'use client';

import type { ReactNode } from 'react';
import { ChevronRight, ChevronUp, CreditCard } from 'lucide-react';
import { formatCardNumber } from '@/modules/payments/checkout/checkout-validation';
import { formatCurrencyCents } from '@/modules/payments/checkout/checkout-formatters';
import type { CheckoutContext, CheckoutFormValues, CheckoutMethod } from '@/modules/payments/checkout/checkout-contract';
import styles from './ReservationCheckout.module.css';

const copy: Record<CheckoutMethod, { title: string; description: string }> = {
  pix: { title: 'Pix', description: 'Pagamento rápido e seguro.' },
  credit: { title: 'Cartão de crédito', description: 'Pague com seu cartão de crédito.' },
  debit: { title: 'Cartão de débito', description: 'Pague com seu cartão de débito.' },
};

type Props = {
  method: CheckoutMethod;
  selected: boolean;
  form: CheckoutFormValues;
  context: CheckoutContext;
  errors: Partial<Record<string, string>>;
  onSelect: (method: CheckoutMethod) => void;
  onPixChange: (field: 'fullName' | 'cpf', value: string) => void;
  onCardChange: (field: keyof CheckoutFormValues['card'], value: string) => void;
  onBlur: (field: string) => void;
};

export function PaymentMethod({ method, selected, form, context, errors, onSelect, onPixChange, onCardChange, onBlur }: Props) {
  const methodText = copy[method];
  return (
    <section className={`${styles.methodCard} ${selected ? styles.methodSelected : ''}`} data-expanded={selected} aria-controls={`payment-fields-${method}`}>
      <label className={styles.methodHeader}>
        <input type="radio" name="payment-method" checked={selected} onChange={() => onSelect(method)} />
        <span className={styles.radio} aria-hidden="true" />
        <MethodIcon method={method} />
        <span className={styles.methodText}>
          <span className={styles.methodTitle}>{methodText.title}</span>
          {!selected && <span className={styles.methodDescription}>{methodText.description}</span>}
        </span>
        {selected ? <ChevronUp className={styles.chevron} size={22} aria-hidden="true" /> : <ChevronRight className={styles.chevron} size={22} aria-hidden="true" />}
      </label>
      {selected && <div id={`payment-fields-${method}`} className={styles.fields}>{method === 'pix' ? <PixFields form={form} errors={errors} onChange={onPixChange} onBlur={onBlur} /> : <CardFields method={method} form={form} context={context} errors={errors} onChange={onCardChange} onBlur={onBlur} />}</div>}
    </section>
  );
}

export function MethodIcon({ method }: { method: CheckoutMethod }) {
  if (method !== 'pix') return <CreditCard className={styles.methodIcon} size={45} strokeWidth={1.5} aria-hidden="true" />;
  return <span className={styles.pixIcon} aria-hidden="true"><i /><i /><i /><i /></span>;
}

function PixFields({ form, errors, onChange, onBlur }: { form: CheckoutFormValues; errors: Partial<Record<string, string>>; onChange: (field: 'fullName' | 'cpf', value: string) => void; onBlur: (field: string) => void }) {
  return <div className={styles.fieldStack}>
    <Field label="Nome completo" error={errors['pix.fullName']}><input value={form.pix.fullName} onChange={(event) => onChange('fullName', event.target.value)} onBlur={() => onBlur('pix.fullName')} placeholder="Digite seu nome completo" autoComplete="name" /></Field>
    <Field label="CPF" error={errors['pix.cpf']}><input value={formatCpf(form.pix.cpf)} onChange={(event) => onChange('cpf', event.target.value)} onBlur={() => onBlur('pix.cpf')} placeholder="Digite seu CPF" inputMode="numeric" autoComplete="off" /></Field>
  </div>;
}

function CardFields({ method, form, context, errors, onChange, onBlur }: { method: 'credit' | 'debit'; form: CheckoutFormValues; context: CheckoutContext; errors: Partial<Record<string, string>>; onChange: (field: keyof CheckoutFormValues['card'], value: string) => void; onBlur: (field: string) => void }) {
  return <div className={styles.fieldStack}>
    <Field label="Nome no cartão" error={errors['card.holderName']}><input value={form.card.holderName} onChange={(event) => onChange('holderName', event.target.value)} onBlur={() => onBlur('card.holderName')} placeholder="Digite o nome como está no cartão" autoComplete="cc-name" /></Field>
    <Field label="Número do cartão" error={errors['card.number']}><div className={styles.cardNumber}><input value={formatCardNumber(form.card.number)} onChange={(event) => onChange('number', event.target.value)} onBlur={() => onBlur('card.number')} placeholder="0000 0000 0000 0000" inputMode="numeric" autoComplete="cc-number" /><BrandMarks /></div></Field>
    <div className={`${styles.cardGrid} ${method === 'debit' ? styles.debitGrid : ''}`}>
      <Field label="Validade" error={errors['card.expiry']}><input value={form.card.expiry} onChange={(event) => onChange('expiry', event.target.value)} onBlur={() => onBlur('card.expiry')} placeholder="MM/AA" inputMode="numeric" autoComplete="cc-exp" /></Field>
      <Field label="CVV" error={errors['card.cvv']}><input value={form.card.cvv} onChange={(event) => onChange('cvv', event.target.value)} onBlur={() => onBlur('card.cvv')} placeholder="123" inputMode="numeric" type="password" autoComplete="off" /></Field>
      {method === 'credit' && <Field label="Parcelamento" error={errors['card.installments']}><select value={form.card.installments} onChange={() => onChange('installments', '1')} onBlur={() => onBlur('card.installments')}><option value={1}>1x de {formatCurrencyCents(context.quote.totalAmountCents)}</option></select></Field>}
    </div>
  </div>;
}

function BrandMarks() {
  return <span className={styles.brands} aria-label="Bandeiras aceitas na demonstração"><b>VISA</b><i className={styles.mastercardMark} /><b className={styles.amexMark}>AMEX</b><b className={styles.eloMark}>elo</b></span>;
}

function formatCpf(value: string) {
  return value.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}{error && <small role="alert">{error}</small>}</label>;
}
