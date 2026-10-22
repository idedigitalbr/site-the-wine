'use client';

import { CircleAlert, Clock3, Copy } from 'lucide-react';
import { formatCurrencyCents } from '@/modules/payments/checkout/checkout-formatters';
import type { CheckoutContext, CheckoutPaymentResult } from '@/modules/payments/checkout/checkout-contract';
import styles from './ReservationCheckout.module.css';
import { MethodIcon } from './CheckoutPaymentMethod';
import { ReservationSummary } from './CheckoutReservationSummary';
import { useEffect, useState } from 'react';

export function PixScreen({ context, payment, onBack, onCopy, copied, onConfirm }: { context: CheckoutContext; payment: Extract<CheckoutPaymentResult, { status: 'pending' }>; onBack: () => void; onCopy: (value: string) => void; copied: boolean; onConfirm: () => void }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((Date.parse(payment.pix.expiresAt) - Date.now()) / 1000)));
  useEffect(() => { const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((Date.parse(payment.pix.expiresAt) - Date.now()) / 1000))), 1000); return () => window.clearInterval(timer); }, [payment.pix.expiresAt]);
  const expired = remaining <= 0;
  return <main className={styles.root}><div className={styles.inner}>
    <button type="button" className={styles.backButton} onClick={onBack}>← <span>Voltar</span></button>
    <CheckoutHeading title="Pague com Pix" subtitle="Escaneie o QR Code ou copie o código Pix para concluir sua reserva." /><GuaranteeNotice context={context} />
    <div className={styles.layout}><section className={styles.pixPanel}><div className={styles.pixPanelHeader}><div><MethodIcon method="pix" /><span>Pix</span></div><span className={styles.expires}><Clock3 size={17} /> Expira em <strong>{expired ? '00:00' : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`}</strong></span></div><div className={styles.pixContent}><div className={styles.qrWrap}><QrCode value={payment.pix.qrValue} /><small>QR Code demonstrativo</small></div><div className={styles.pixCode}><span>Valor total</span><strong>{formatCurrencyCents(context.quote.totalAmountCents)}</strong><span>Código Pix</span><code>{payment.pix.displayCode}</code><button type="button" onClick={() => onCopy(payment.pix.displayCode)}><Copy size={16} />{copied ? 'Código copiado' : 'Copiar código Pix'}</button></div></div><div className={styles.pixNotice}><CircleAlert size={17} aria-hidden="true" /><span>A confirmação do Pix demonstrativo é manual e não realiza cobrança.</span></div><button type="button" className={styles.demoConfirm} onClick={onConfirm} disabled={expired}>Simular confirmação do Pix</button></section><div className={styles.pixSummary}><ReservationSummary context={context} /></div></div>
  </div></main>;
}

export function GuaranteeNotice({ context }: { context: CheckoutContext }) {
  const [now, setNow] = useState(() => Date.now());
  const [clockOffset] = useState(() => Date.now() - Date.parse(context.serverNow));
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  if (!context.paymentDeadlineAt || !context.seatGuaranteeExpiresAt) return null;
  const effectiveEnd = Math.min(Date.parse(context.seatGuaranteeExpiresAt), Date.parse(context.paymentDeadlineAt));
  const remaining = effectiveEnd - (now - clockOffset);
  if (remaining <= 0) return <p className={styles.guaranteeNotice}>O prazo de garantia terminou. Você ainda pode pagar, sujeito à disponibilidade.</p>;
  const end = new Date(effectiveEnd);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: context.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(end);
  return <p className={styles.guaranteeNotice}>Conclua o pagamento até <strong>{time}</strong> para garantir sua vaga. Após esse horário, o pagamento dependerá da disponibilidade.</p>;
}

export function CheckoutHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className={styles.heading}><p>FINALIZAR RESERVA</p><h1 tabIndex={-1} data-checkout-heading>{title}</h1>{subtitle && <span>{subtitle}</span>}</header>;
}

function QrCode({ value }: { value: string }) { return <div className={styles.qr} aria-label="QR Code demonstrativo sem cobrança">{Array.from({ length: 81 }, (_, index) => <i key={index} data-on={isQrCellOn(index, value)} />)}</div>; }
function isQrCellOn(index: number, value: string): boolean { const row = Math.floor(index / 9); const col = index % 9; return isFinderCell(col, row, 0, 0) || isFinderCell(col, row, 6, 0) || isFinderCell(col, row, 0, 6) || isQrDataCell(index, value); }
function isFinderCell(col: number, row: number, x: number, y: number): boolean { const inside = col >= x && col < x + 3 && row >= y && row < y + 3; return inside && (isFinderEdge(col, row, x, y) || isFinderCenter(col, row, x, y)); }
function isFinderEdge(col: number, row: number, x: number, y: number): boolean { return col === x || col === x + 2 || row === y || row === y + 2; }
function isFinderCenter(col: number, row: number, x: number, y: number): boolean { return col === x + 1 && row === y + 1; }
function isQrDataCell(index: number, value: string): boolean { return (index * 17 + value.charCodeAt(index % value.length)) % 5 < 2; }
