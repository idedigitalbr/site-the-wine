'use client';

import {
  Check,
  CircleAlert,
  Clock3,
  Copy,
  CreditCard,
  QrCode,
  RotateCcw,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  mockPaymentMethods,
  mockPaymentScenarios,
  simulateMockPayment,
  type MockPayment,
  type MockPaymentMethod,
  type MockPaymentScenario,
} from '@/modules/payments/demo/mock-payment';

const methodLabels: Record<MockPaymentMethod, string> = {
  pix: 'Pix demonstrativo',
  card: 'Cartão demonstrativo',
};

const scenarioLabels: Record<MockPaymentScenario, string> = {
  approved: 'Simular aprovação',
  processing: 'Simular aguardando',
  failed: 'Simular recusa',
};

const statusContent: Record<MockPayment['status'], { label: string; description: string; icon: typeof Check }> = {
  paid: {
    label: 'Pagamento aprovado',
    description: 'A reserva estaria pronta para confirmação automática pelo webhook.',
    icon: Check,
  },
  processing: {
    label: 'Aguardando pagamento',
    description: 'A reserva permaneceria aguardando o retorno do provedor.',
    icon: Clock3,
  },
  failed: {
    label: 'Pagamento recusado',
    description: 'O cliente poderia tentar novamente ou falar com a equipe.',
    icon: XCircle,
  },
};

function MethodIcon({ method }: { method: MockPaymentMethod }) {
  return method === 'pix' ? <QrCode aria-hidden="true" size={18} /> : <CreditCard aria-hidden="true" size={18} />;
}

function MockPaymentResult({ payment, copied, onCopy, onReset }: { payment: MockPayment; copied: boolean; onCopy: () => void; onReset: () => void }) {
  const content = statusContent[payment.status];
  const Icon = content.icon;
  const statusClass = payment.status === 'paid'
    ? 'border-status-success/30 bg-status-success/10 text-status-success'
    : payment.status === 'failed'
      ? 'border-status-danger/30 bg-status-danger/10 text-status-danger'
      : 'border-primary/30 bg-primary/10 text-primary';

  return (
    <div className="mt-6 rounded-[var(--radius-md)] border border-border bg-surface p-4 sm:p-5">
      <div className={`flex items-start gap-3 rounded-[var(--radius-sm)] border p-3 ${statusClass}`} role="status">
        <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={19} />
        <div>
          <p className="text-sm font-semibold">{content.label}</p>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{content.description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-[var(--radius-sm)] bg-surface-muted p-3"><span className="block text-xs text-muted">Referência</span><strong className="mt-1 block text-foreground">{payment.id}</strong></div>
        <div className="rounded-[var(--radius-sm)] bg-surface-muted p-3"><span className="block text-xs text-muted">Valor ilustrativo</span><strong className="mt-1 block text-foreground">R$ {payment.amount.toFixed(2).replace('.', ',')}</strong></div>
      </div>
      {payment.method === 'pix' && payment.status !== 'failed' && (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-surface-muted p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><QrCode aria-hidden="true" size={17} className="text-primary" /> Código Pix de demonstração</div>
          <code className="mt-2 block break-all text-[11px] leading-relaxed text-muted">{payment.pixCopyPaste}</code>
          <button type="button" onClick={onCopy} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline">{copied ? <Check aria-hidden="true" size={14} /> : <Copy aria-hidden="true" size={14} />} {copied ? 'Código copiado' : 'Copiar código'}</button>
        </div>
      )}
      {payment.method === 'card' && <p className="mt-4 flex items-center gap-2 text-xs text-muted"><WalletCards aria-hidden="true" size={15} className="text-primary" /> Cartão de demonstração final {payment.cardLastFour}.</p>}
      <button type="button" onClick={onReset} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary"><RotateCcw aria-hidden="true" size={14} /> Limpar simulação</button>
    </div>
  );
}

export function MockPaymentDemo({ reservationId, publicCode }: { reservationId: number; publicCode: string }) {
  const [method, setMethod] = useState<MockPaymentMethod>('pix');
  const [payment, setPayment] = useState<MockPayment | null>(null);
  const [copied, setCopied] = useState(false);

  const simulate = (scenario: MockPaymentScenario) => {
    setCopied(false);
    setPayment(simulateMockPayment({ reservationId, method, scenario }));
  };

  const copyPix = () => {
    if (!payment?.pixCopyPaste) return;
    void navigator.clipboard.writeText(payment.pixCopyPaste).then(() => setCopied(true)).catch(() => setCopied(false));
  };

  return (
    <section className="mt-8 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4 text-left sm:p-5" aria-labelledby="mock-payment-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><CircleAlert aria-hidden="true" size={15} /> Ambiente demonstrativo</p>
          <h3 id="mock-payment-title" className="mt-2 font-display text-2xl text-foreground">Pagamento simulado</h3>
        </div>
        <span className="rounded-full border border-primary/30 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-primary">MOCK</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">Esta etapa é apenas visual. Nenhuma cobrança, chamada ao Mercado Pago ou webhook real será executada.</p>
      <p className="mt-2 text-xs text-muted">Reserva {publicCode} · valor ilustrativo de R$ 50,00</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {mockPaymentMethods.map((paymentMethod) => (
          <button key={paymentMethod} type="button" onClick={() => { setMethod(paymentMethod); setPayment(null); setCopied(false); }} aria-pressed={method === paymentMethod} className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-3 text-left text-sm font-semibold transition ${method === paymentMethod ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted hover:border-primary'}`}>
            <MethodIcon method={paymentMethod} />
            {methodLabels[paymentMethod]}
          </button>
        ))}
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Escolha um resultado</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {mockPaymentScenarios.map((scenario) => <button key={scenario} type="button" onClick={() => simulate(scenario)} className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"><MethodIcon method={method} /> {scenarioLabels[scenario]}</button>)}
        </div>
      </div>
      {payment && <MockPaymentResult payment={payment} copied={copied} onCopy={copyPix} onReset={() => { setPayment(null); setCopied(false); }} />}
    </section>
  );
}
