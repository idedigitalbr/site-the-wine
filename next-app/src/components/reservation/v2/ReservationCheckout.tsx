'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CircleAlert, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { confirmDemoPix, fetchReservationCheckout, startReservationCheckout } from '@/lib/reservation-checkout-client';
import { sanitizeCardNumber, sanitizeCvv, sanitizeExpiry, sanitizePersonName, validateActivePayment } from '@/modules/payments/checkout/checkout-validation';
import type { CheckoutContext, CheckoutFormValues, CheckoutMethod, CheckoutPaymentResult } from '@/modules/payments/checkout/checkout-contract';
import styles from './ReservationCheckout.module.css';
import { CheckoutHeading, GuaranteeNotice, PixScreen } from './CheckoutPixPanel';
import { PaymentMethod } from './CheckoutPaymentMethod';
import { ReservationSummary } from './CheckoutReservationSummary';
import { SuccessScreen } from './CheckoutSuccess';

type Props = { reservationId: number; publicCode: string };
type Screen = 'checkout' | 'pix' | 'success';
type TouchedFields = Record<string, boolean>;
const emptyForm: CheckoutFormValues = { method: null, pix: { fullName: '', cpf: '' }, card: { holderName: '', number: '', expiry: '', cvv: '', installments: 1 } };

function createCheckoutOperationKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function ReservationCheckout({ reservationId, publicCode: _publicCode }: Props) {
  const [screen, setScreen] = useState<Screen>('checkout');
  const [context, setContext] = useState<CheckoutContext | null>(null);
  const [form, setForm] = useState<CheckoutFormValues>(emptyForm);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [busy, setBusy] = useState(false);
  const [loadingError, setLoadingError] = useState<Error | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [payment, setPayment] = useState<CheckoutPaymentResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.reservationCheckout = 'true';
    const controller = new AbortController();
    void fetchReservationCheckout(reservationId, controller.signal).then((value) => { setContext(value); setResumedScreen(value, setScreen, setPayment); }).catch((error: unknown) => handleCheckoutLoadError(error, setLoadingError));
    return () => { controller.abort(); delete document.documentElement.dataset.reservationCheckout; };
  }, [reservationId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [screen, context]);

  const validation = useMemo(() => validateActivePayment(form.method, form), [form]);
  const validationErrors = useMemo<Partial<Record<string, string>>>(() => {
    if (validation.success) return {};
    return Object.fromEntries(Object.entries(validation.errors).filter(([field]) => touched[field])) as Partial<Record<string, string>>;
  }, [touched, validation]);
  const canSubmit = Boolean(context && context.eligibility.allowed && context.mode === 'demo' && form.method && validation.success && !busy);

  function selectMethod(method: CheckoutMethod) {
    setForm((current) => ({ ...current, method, card: method === 'pix' ? { ...emptyForm.card } : { ...current.card, cvv: '', installments: 1 } }));
    setTouched({});
    setPaymentError('');
  }
  function updatePix(field: 'fullName' | 'cpf', value: string) {
    const next = field === 'fullName' ? sanitizePersonName(value) : value.replace(/\D/g, '').slice(0, 11);
    setForm((current) => ({ ...current, pix: { ...current.pix, [field]: next } }));
  }
  function updateCard(field: keyof CheckoutFormValues['card'], value: string) {
    setForm((current) => ({ ...current, card: { ...current.card, [field]: sanitizeCardField(field, value) } }));
  }
  function touch(field: string) { setTouched((current) => ({ ...current, [field]: true })); }
  async function submit() {
    setTouched(activeFieldMap(form.method));
    setPaymentError('');
    if (!canSubmit) return;
    setBusy(true);
    const operationKey = createCheckoutOperationKey();
    try { const result = await startReservationCheckout({ reservationId, quoteId: context!.quote.id, totalAmountCents: context!.quote.totalAmountCents, method: form.method!, operationKey }); setPayment(result); setForm((current) => ({ ...current, card: { ...emptyForm.card }, pix: { ...current.pix } })); setScreen(result.status === 'pending' ? 'pix' : 'success'); } catch (error) { if (!isAbortError(error)) setPaymentError(error instanceof Error && error.name ? checkoutCommandError(error.name) : 'Não foi possível processar esta demonstração. Tente novamente.'); } finally { setBusy(false); }
  }
  function goBack() { if (screen === 'pix') { setScreen('checkout'); setPayment(null); setCopied(false); return; } window.history.back(); }
  function copy(value: string) { void navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => setCopied(false)); }
  async function confirmPix(_paymentId: string) { if (!context) return; setBusy(true); try { const result = await confirmDemoPix({ reservationId, quoteId: context.quote.id, totalAmountCents: context.quote.totalAmountCents, operationKey: createCheckoutOperationKey() }); setPayment(result); setScreen('success'); } catch (error) { setPaymentError(error instanceof Error ? checkoutCommandError(error.name) : 'Não foi possível confirmar o Pix demonstrativo.'); } finally { setBusy(false); } }

  return renderCheckoutView({ loadingError, context, screen, payment, form, busy, canSubmit, paymentError, validationErrors, copied, goBack, copy, confirmPix, submit, selectMethod, updatePix, updateCard, touch });
}

function renderCheckoutView({ loadingError, context, screen, payment, form, busy, canSubmit, paymentError, validationErrors, copied, goBack, copy, confirmPix, submit, selectMethod, updatePix, updateCard, touch }: { loadingError: Error | null; context: CheckoutContext | null; screen: Screen; payment: CheckoutPaymentResult | null; form: CheckoutFormValues; busy: boolean; canSubmit: boolean; paymentError: string; validationErrors: Partial<Record<string, string>>; copied: boolean; goBack: () => void; copy: (value: string) => void; confirmPix: (paymentId: string) => void; submit: () => Promise<void>; selectMethod: (method: CheckoutMethod) => void; updatePix: (field: 'fullName' | 'cpf', value: string) => void; updateCard: (field: keyof CheckoutFormValues['card'], value: string) => void; touch: (field: string) => void }) {
  if (loadingError) return <CheckoutState {...checkoutErrorCopy(loadingError)} />;
  if (!context) return <CheckoutLoading />;
  const paymentView = renderPaymentView(screen, payment, context, goBack, copy, copied, confirmPix);
  if (paymentView) return paymentView;
  return <CheckoutScreen context={context} form={form} busy={busy} canSubmit={canSubmit} paymentError={paymentError} validationErrors={validationErrors} onSubmit={submit} onSelectMethod={selectMethod} onPixChange={updatePix} onCardChange={updateCard} onBlur={touch} />;
}

function renderPaymentView(screen: Screen, payment: CheckoutPaymentResult | null, context: CheckoutContext, goBack: () => void, copy: (value: string) => void, copied: boolean, confirmPix: (paymentId: string) => void) {
  if (screen === 'pix' && payment?.status === 'pending') return <PixScreen context={context} payment={payment} onBack={goBack} onCopy={copy} copied={copied} onConfirm={() => confirmPix(payment.paymentId)} />;
  if (screen === 'success' && payment?.status === 'paid') return <SuccessScreen context={context} payment={payment} onCopy={copy} copied={copied} />;
  return null;
}

function CheckoutScreen({ context, form, busy, canSubmit, paymentError, validationErrors, onSubmit, onSelectMethod, onPixChange, onCardChange, onBlur }: { context: CheckoutContext; form: CheckoutFormValues; busy: boolean; canSubmit: boolean; paymentError: string; validationErrors: Partial<Record<string, string>>; onSubmit: () => Promise<void>; onSelectMethod: (method: CheckoutMethod) => void; onPixChange: (field: 'fullName' | 'cpf', value: string) => void; onCardChange: (field: keyof CheckoutFormValues['card'], value: string) => void; onBlur: (field: string) => void }) {
  return <main className={styles.root} data-checkout-root><div className={styles.inner}><Link href="/" className={styles.backButton} aria-label="Voltar para a página inicial"><span aria-hidden="true">←</span> Página inicial</Link><CheckoutHeading title="Escolha a forma de pagamento" /><GuaranteeNotice context={context} /><div className={styles.layout}><form id="reservation-checkout-form" className={styles.methods} onSubmit={(event) => { event.preventDefault(); void onSubmit(); }}>{(['pix', 'credit', 'debit'] as CheckoutMethod[]).map((method) => <PaymentMethod key={method} method={method} selected={form.method === method} context={context} form={form} onSelect={onSelectMethod} onPixChange={onPixChange} onCardChange={onCardChange} errors={validationErrors} onBlur={onBlur} />)}{paymentError && <p className={styles.errorMessage} role="alert"><CircleAlert size={16} aria-hidden="true" />{paymentError}</p>}</form><aside className={styles.aside}><ReservationSummary context={context} /><button type="submit" form="reservation-checkout-form" disabled={!canSubmit} className={`${styles.submitButton} ${canSubmit ? styles.submitEnabled : ''}`}>{busy ? <><LoaderCircle size={18} className={styles.spin} /> Processando…</> : checkoutButtonLabel(form.method)}<ArrowRight size={20} aria-hidden="true" /></button><p className={styles.demoNote}>Demonstração: nenhuma cobrança será realizada. Use dados fictícios.</p></aside></div></div></main>;
}

function activeFieldMap(method: CheckoutMethod | null): TouchedFields {
  if (method === 'pix') return { 'pix.fullName': true, 'pix.cpf': true };
  if (method === 'credit') return { 'card.holderName': true, 'card.number': true, 'card.expiry': true, 'card.cvv': true, 'card.installments': true };
  if (method === 'debit') return { 'card.holderName': true, 'card.number': true, 'card.expiry': true, 'card.cvv': true };
  return {};
}
function checkoutButtonLabel(method: CheckoutMethod | null): string { if (!method) return 'Escolha uma forma de pagamento'; return method === 'pix' ? 'Pagar com Pix' : method === 'credit' ? 'Pagar com cartão de crédito' : 'Pagar com cartão de débito'; }
function sanitizeCardField(field: keyof CheckoutFormValues['card'], value: string): string | number { if (field === 'holderName') return sanitizePersonName(value); if (field === 'number') return sanitizeCardNumber(value); if (field === 'expiry') return sanitizeExpiry(value); if (field === 'cvv') return sanitizeCvv(value); return 1; }
// Resume payloads are deliberately checked together so an incomplete server record never opens a fake screen.
// eslint-disable-next-line complexity
function resumedPayment(value: CheckoutContext): { screen: Screen; payment: CheckoutPaymentResult } | null {
  const resume = value.resume;
  if (resume.state === 'pix_pending' && resume.method === 'pix' && resume.paymentId && resume.pixDisplayCode && resume.pixQrValue && resume.pixExpiresAt) {
    return { screen: 'pix', payment: { paymentId: resume.paymentId, reservationId: value.reservation.id, method: 'pix', mode: 'demo', totalAmountCents: value.quote.totalAmountCents, status: 'pending', pix: { displayCode: resume.pixDisplayCode, qrValue: resume.pixQrValue, expiresAt: resume.pixExpiresAt } } };
  }
  if ((resume.state === 'demo_completed' || resume.state === 'paid') && resume.paymentId && resume.paidAt) {
    return { screen: 'success', payment: { paymentId: resume.paymentId, reservationId: value.reservation.id, method: resume.method ?? 'credit', mode: 'demo', totalAmountCents: value.quote.totalAmountCents, status: 'paid', paidAt: resume.paidAt, demonstrative: true } };
  }
  return null;
}

function setResumedScreen(value: CheckoutContext, setScreen: (screen: Screen) => void, setPayment: (payment: CheckoutPaymentResult) => void) {
  const resumed = resumedPayment(value);
  if (!resumed) return;
  setPayment(resumed.payment);
  setScreen(resumed.screen);
}

function checkoutCommandError(code: string): string { const messages: Record<string, string> = { reservation_payment_deadline_passed: 'O prazo para pagamento desta reserva terminou.', reservation_capacity_unavailable: 'A garantia terminou e não há disponibilidade para esse horário.', checkout_pix_expired: 'Este Pix expirou. Gere um novo código para continuar.', checkout_quote_changed: 'O valor da reserva mudou. Atualize a página e tente novamente.' }; return messages[code] ?? 'Não foi possível processar esta demonstração. Tente novamente.'; }
function isAbortError(error: unknown): boolean { return error instanceof DOMException && error.name === 'AbortError'; }
function handleCheckoutLoadError(error: unknown, setError: (value: Error) => void): void { if (!isAbortError(error)) setError(error instanceof Error ? error : new Error('checkout_unavailable')); }
function checkoutErrorCopy(error: Error) { const unauthorized = error.name === 'unauthorized'; return { title: 'Não foi possível carregar sua reserva', message: unauthorized ? 'Seu acesso expirou. Entre novamente para consultar suas reservas.' : error.message, action: unauthorized ? '/acesso?returnTo=%2Flista-de-reservas' : '/lista-de-reservas', actionLabel: unauthorized ? 'Entrar novamente' : 'Voltar para minhas reservas' }; }

function CheckoutLoading() { return <main className={styles.root}><div className={styles.inner}><div className={styles.skeletonHeading} /><div className={styles.skeletonGrid}><div /><div /></div></div></main>; }
function CheckoutState({ title, message, action, actionLabel }: { title: string; message: string; action: string; actionLabel: string }) { return <main className={styles.root}><div className={styles.state}><CircleAlert size={31} /><h1>{title}</h1><p>{message}</p><Link href={action} className={styles.goldAction}>{actionLabel}<ArrowRight size={18} /></Link></div></main>; }
