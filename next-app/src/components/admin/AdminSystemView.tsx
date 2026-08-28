'use client';

import {
  Check,
  Eye,
  FileText,
  Info,
  LoaderCircle,
  Mail,
  RotateCcw,
  Save,
  Send,
  Server,
  ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import { useState, type FormEvent } from 'react';
import type { AdminSystem, SystemEmailTemplate, SystemSmtpSettings } from '@/modules/system/application/ports';

type SystemTab = 'smtp' | 'templates';
type TemplateDraft = Pick<SystemEmailTemplate, 'subject' | 'body' | 'active'>;

const securityLabels = {
  none: 'Sem criptografia',
  starttls: 'STARTTLS',
  ssl: 'SSL/TLS',
} as const;

const sampleValues: Record<string, string> = {
  customer_name: 'Isabela Nascimento',
  reservation_code: 'TW-DEMO-2026',
  reservation_date: '28/08/2026',
  reservation_time: '19:00',
  guest_count: '4',
  private_link: 'thewine.suporteide.digital/minha-reserva',
  waitlist_code: 'WL-000024',
};

function statusLabel(status: SystemSmtpSettings['lastTestStatus']): string {
  if (status === 'success') return 'Teste simulado aprovado';
  if (status === 'failed') return 'Último teste apresentou erro';
  return 'Ainda não testado';
}

function errorLabel(responseStatus: number): string {
  if (responseStatus === 400) return 'Confira os campos destacados e tente novamente.';
  if (responseStatus === 401) return 'Sua sessão expirou. Entre novamente no painel.';
  return 'Não foi possível salvar a configuração agora.';
}

function replaceVariables(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/\\n/g, '\n').replace(/{{\s*([a-z0-9_]+)\s*}}/gi, (_, key: string) => sampleValues[key] ?? `{{${key}}}`);
}

function EmailMessagePreview({ subject, body }: { subject: string; body: string }) {
  const renderedBody = replaceVariables(body);
  return <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[#d9d2c7] bg-[#f2eee8] shadow-sm" aria-label="Prévia visual do e-mail"><div className="flex min-h-20 items-center justify-center bg-[#070707] px-6 py-5"><Image src="/assets/Logos/logo_the_wine_branco_dourado_transparente.webp" alt="The Wine Experience" width={208} height={68} className="h-auto w-44 object-contain" /></div><div className="bg-[#fffdf9] px-6 py-7"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ae8741]">The Wine Experience · Reservas</p><h4 className="mt-3 font-display text-xl leading-snug text-[#161616]">{replaceVariables(subject)}</h4><div className="mt-5 space-y-3 text-sm leading-6 text-[#4d4a45]">{renderedBody.split('\n').map((line, index) => line ? <p key={`${line}-${index}`}>{line}</p> : <div key={`space-${index}`} className="h-1" />)}</div><div className="mt-7 border-t border-[#e6dfd6] pt-4 text-[11px] leading-5 text-[#817b72]">Esta é uma mensagem automática do The Wine Experience. Para acompanhar sua reserva, use o link informado nesta mensagem.</div></div></div>;
}

function SmtpStatusPill({ enabled }: { enabled: boolean }) {
  const state = enabled
    ? { label: 'Ativo', dot: 'bg-status-success', className: 'border-status-success/30 bg-status-success/10 text-status-success' }
    : { label: 'Desativado', dot: 'bg-muted', className: 'border-border bg-surface-muted text-muted' };
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${state.className}`}><span className={`h-2 w-2 rounded-full ${state.dot}`} />{state.label}</span>;
}

function SmtpPasswordField({ smtp }: { smtp: SystemSmtpSettings }) {
  const copy = smtp.passwordConfigured
    ? { placeholder: 'Senha já salva — informe para substituir', hint: 'A senha atual está protegida e não é exibida.' }
    : { placeholder: 'Informe a senha quando ativar', hint: 'A senha será protegida antes de ser armazenada.' };
  return <label><span className="admin-label">Senha SMTP</span><input name="password" type="password" className="admin-input" placeholder={copy.placeholder} autoComplete="new-password" /><span className="mt-1 block text-xs text-muted">{copy.hint}</span></label>;
}

function SmtpActionBar({ smtp, isTesting, isSaving, onTest }: { smtp: SystemSmtpSettings; isTesting: boolean; isSaving: boolean; onTest: () => void }) {
  const testIcon = isTesting ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Send aria-hidden="true" size={16} />;
  const saveIcon = isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Save aria-hidden="true" size={16} />;
  return <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-muted"><ShieldCheck aria-hidden="true" className="text-primary" size={16} />{statusLabel(smtp.lastTestStatus)}{smtp.lastTestedAt ? ` · ${smtp.lastTestedAt}` : ''}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={onTest} disabled={isTesting || isSaving} className="admin-secondary-button">{testIcon} Enviar e-mail de teste (mock)</button><button type="submit" disabled={isSaving || isTesting} className="admin-primary-button">{saveIcon} Salvar configuração</button></div></div>;
}

function testSmtpErrorLabel(status: number, code?: string): string {
  if (code === 'incomplete_settings') return 'Preencha o servidor SMTP e o e-mail remetente acima para executar o teste.';
  if (code === 'invalid_test_recipient') return 'Informe um e-mail de teste válido.';
  if (status === 400) return 'Confira os dados do SMTP antes de testar.';
  return 'Não foi possível executar o teste demonstrativo.';
}

function SmtpFeedback({ message, error }: { message: string; error: string }) {
  return <>{message && <p role="status" className="flex items-center gap-2 text-sm text-status-success"><Check aria-hidden="true" size={16} />{message}</p>}{error && <p role="alert" className="text-sm text-status-danger">{error}</p>}</>;
}

function SmtpPanel({ smtp, onSaved }: { smtp: SystemSmtpSettings; onSaved: () => Promise<void> }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    setError('');
    const values = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/system/smtp', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: values.get('enabled') === 'on',
        host: values.get('host'),
        port: Number(values.get('port')),
        security: values.get('security'),
        username: values.get('username'),
        password: values.get('password'),
        fromEmail: values.get('fromEmail'),
        fromName: values.get('fromName'),
      }),
    });
    if (!response.ok) {
      setError(errorLabel(response.status));
      setIsSaving(false);
      return;
    }
    await onSaved();
    setMessage('Configuração SMTP salva com segurança.');
    setIsSaving(false);
  };

  const test = async () => {
    if (!testEmail.trim()) {
      setError('Informe um e-mail de destino para simular o disparo.');
      return;
    }
    setIsTesting(true);
    setMessage('');
    setError('');
    const response = await fetch('/api/admin/system/smtp/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientEmail: testEmail }) });
    const result = await response.json().catch(() => ({})) as { error?: string; message?: string };
    if (!response.ok) {
      setError(testSmtpErrorLabel(response.status, result.error));
      setIsTesting(false);
      return;
    }
    await onSaved();
    setMessage(result.message ?? 'Teste demonstrativo registrado.');
    setIsTesting(false);
  };

  return (
    <section className="mt-6 rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm sm:p-7" aria-labelledby="smtp-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-primary/10 p-2 text-primary"><Server aria-hidden="true" size={20} /></span>
          <div><h2 id="smtp-title" className="font-display text-2xl text-foreground">Servidor SMTP</h2><p className="mt-1 text-sm text-muted">Prepare o canal de e-mail que será usado pelos avisos da operação.</p></div>
        </div>
        <SmtpStatusPill enabled={smtp.enabled} />
      </div>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <label className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-muted p-4"><input name="enabled" type="checkbox" defaultChecked={smtp.enabled} className="mt-0.5 h-4 w-4 accent-primary" /><span><strong className="block text-sm text-foreground">Habilitar configurações SMTP</strong><span className="mt-1 block text-xs text-muted">O envio continuará simulado até o provedor ser ativado em produção.</span></span></label>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_9rem_12rem]">
          <label><span className="admin-label">Servidor SMTP</span><input name="host" defaultValue={smtp.host} className="admin-input" placeholder="smtp.exemplo.com" /></label>
          <label><span className="admin-label">Porta</span><input name="port" type="number" min="1" max="65535" defaultValue={smtp.port} className="admin-input" /></label>
          <label><span className="admin-label">Segurança</span><select name="security" defaultValue={smtp.security} className="admin-input">{Object.entries(securityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label><span className="admin-label">Usuário SMTP</span><input name="username" defaultValue={smtp.username} className="admin-input" placeholder="usuario@dominio.com" autoComplete="off" /></label>
          <SmtpPasswordField smtp={smtp} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <label><span className="admin-label">E-mail remetente</span><input name="fromEmail" type="email" defaultValue={smtp.fromEmail} className="admin-input" placeholder="reservas@thewine.com.br" /></label>
          <label><span className="admin-label">Nome remetente</span><input name="fromName" defaultValue={smtp.fromName} className="admin-input" placeholder="The Wine Experience" /></label>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-primary/25 bg-primary/5 p-4"><div className="flex items-start gap-3"><span className="rounded-full bg-primary/10 p-2 text-primary"><Send aria-hidden="true" size={17} /></span><div><strong className="block text-sm text-foreground">Destinatário do teste</strong><p className="mt-1 text-xs leading-relaxed text-muted">Informe um endereço para simular o disparo de uma mensagem. Este valor não é salvo e nenhum e-mail real será enviado.</p></div></div><label className="mt-4 block max-w-xl"><span className="admin-label">E-mail para teste</span><input name="testRecipientEmail" type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className="admin-input" placeholder="seu-email@exemplo.com" autoComplete="email" /></label></div>
        <SmtpActionBar smtp={smtp} isTesting={isTesting} isSaving={isSaving} onTest={() => void test()} />
        <SmtpFeedback message={message} error={error} />
      </form>
    </section>
  );
}

function TemplateEditor({ template, onSaved, onCancel, onRestore, isSaving }: { template: SystemEmailTemplate; onSaved: (draft: TemplateDraft) => Promise<void>; onCancel: () => void; onRestore: () => Promise<void>; isSaving: boolean }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [active, setActive] = useState(template.active);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSaved({ subject, body, active });
  };

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Editando modelo</p><h3 className="mt-1 font-display text-2xl text-foreground">{template.name}</h3><p className="mt-1 text-sm text-muted">{template.description}</p></div><label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-primary" /> Ativo</label></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"><div className="space-y-5"><label><span className="admin-label">Assunto</span><input value={subject} onChange={(event) => setSubject(event.target.value)} className="admin-input" /></label><label><span className="admin-label">Conteúdo do e-mail</span><textarea value={body} onChange={(event) => setBody(event.target.value)} className="admin-input min-h-64 resize-y leading-relaxed" /></label><div><span className="admin-label">Variáveis disponíveis</span><div className="flex flex-wrap gap-2">{template.variables.map((variable) => <code key={variable} className="rounded bg-surface px-2 py-1 text-xs text-primary">{'{{'}{variable}{'}}'}</code>)}</div></div></div><div className="rounded-[var(--radius-sm)] border border-border bg-surface p-4"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground"><Eye aria-hidden="true" className="text-primary" size={16} /> Prévia exata do e-mail</div><EmailMessagePreview subject={subject} body={body} /></div></div>
      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-5"><button type="button" onClick={() => void onRestore()} disabled={isSaving} className="admin-secondary-button"><RotateCcw aria-hidden="true" size={15} /> Restaurar padrão</button><button type="button" onClick={onCancel} disabled={isSaving} className="admin-secondary-button">Cancelar</button><button type="submit" disabled={isSaving} className="admin-primary-button">{isSaving ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Save aria-hidden="true" size={16} />} Salvar modelo</button></div>
    </form>
  );
}

function TemplateList({ templates, selectedId, onSelect }: { templates: SystemEmailTemplate[]; selectedId: number | null; onSelect: (id: number) => void }) {
  return <div className="space-y-3">{templates.map((template) => <button key={template.id} type="button" onClick={() => onSelect(template.id)} className={`flex w-full items-start gap-3 rounded-[var(--radius-sm)] border p-4 text-left transition ${selectedId === template.id ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'}`}><span className={`mt-0.5 rounded-full p-2 ${selectedId === template.id ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-primary'}`}><FileText aria-hidden="true" size={17} /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-foreground">{template.name}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${template.active ? 'bg-status-success/10 text-status-success' : 'bg-surface-muted text-muted'}`}>{template.active ? 'Ativo' : 'Inativo'}</span></span><span className="mt-1 block text-xs leading-relaxed text-muted">{template.description}</span><span className="mt-2 block truncate text-xs text-primary">{template.subject}</span></span></button>)}</div>;
}

function useTemplateActions(selected: SystemEmailTemplate | undefined, onSaved: () => Promise<void>) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async (draft: TemplateDraft) => {
    if (!selected) return;
    setIsSaving(true);
    setMessage('');
    setError('');
    const response = await fetch(`/api/admin/system/templates/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (!response.ok) {
      setError(response.status === 400 ? 'O assunto e o conteúdo precisam ser preenchidos corretamente.' : 'Não foi possível salvar o modelo.');
      setIsSaving(false);
      return;
    }
    await onSaved();
    setMessage('Modelo de e-mail salvo.');
    setIsSaving(false);
  };

  const restore = async () => {
    if (!selected || !window.confirm('Restaurar o conteúdo padrão deste modelo?')) return;
    setIsSaving(true);
    setMessage('');
    setError('');
    const response = await fetch(`/api/admin/system/templates/${selected.id}/restore`, { method: 'POST' });
    if (!response.ok) {
      setError('Não foi possível restaurar o modelo padrão.');
      setIsSaving(false);
      return;
    }
    await onSaved();
    setMessage('Modelo restaurado para o padrão.');
    setIsSaving(false);
  };

  return { isSaving, message, error, save, restore };
}

function TemplateWorkspace({ selected, save, restore, isSaving, message, error, onCancel }: { selected: SystemEmailTemplate | undefined; save: (draft: TemplateDraft) => Promise<void>; restore: () => Promise<void>; isSaving: boolean; message: string; error: string; onCancel: () => void }) {
  return <div>{selected ? <TemplateEditor key={selected.id} template={selected} onSaved={save} onCancel={onCancel} onRestore={restore} isSaving={isSaving} /> : <div className="rounded-[var(--radius-md)] border border-dashed border-border p-12 text-center text-sm text-muted">Selecione um template para começar.</div>}{message && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-status-success"><Check aria-hidden="true" size={16} />{message}</p>}{error && <p role="alert" className="mt-4 text-sm text-status-danger">{error}</p>}</div>;
}

function TemplatesPanel({ templates, onSaved }: { templates: SystemEmailTemplate[]; onSaved: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState<number | null>(templates[0]?.id ?? null);
  const selected = templates.find((template) => template.id === selectedId) ?? templates[0];
  const { isSaving, message, error, save, restore } = useTemplateActions(selected, onSaved);

  return <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.5fr)]"><div className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="rounded-full bg-primary/10 p-2 text-primary"><Mail aria-hidden="true" size={20} /></span><div><h2 className="font-display text-2xl text-foreground">Templates de e-mail</h2><p className="mt-1 text-sm text-muted">Escolha um modelo para editar o texto enviado ao cliente.</p></div></div><TemplateList templates={templates} selectedId={selected?.id ?? null} onSelect={setSelectedId} /></div><TemplateWorkspace selected={selected} save={save} restore={restore} isSaving={isSaving} message={message} error={error} onCancel={() => setSelectedId(null)} /></section>;
}

export function AdminSystemView({ initialSystem }: { initialSystem: AdminSystem }) {
  const [system, setSystem] = useState(initialSystem);
  const [activeTab, setActiveTab] = useState<SystemTab>('smtp');

  const refresh = async () => {
    const response = await fetch('/api/admin/system');
    if (response.ok) setSystem(await response.json() as AdminSystem);
  };

  return <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Sistema</p><h1 className="mt-2 font-display text-4xl text-foreground">Configurações do sistema</h1><p className="mt-2 max-w-2xl text-sm text-muted">Organize as comunicações automáticas e os modelos usados para acompanhar cada reserva.</p></header><section className="mt-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4 text-sm text-foreground"><Info aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18} /><p><strong>Modo demonstrativo.</strong> O SMTP e os templates estão prontos para configuração, mas nenhum e-mail real será enviado nesta etapa. O botão de teste apenas registra uma simulação.</p></section><div className="mt-8 flex gap-2 border-b border-border" role="tablist" aria-label="Configurações do sistema"><button type="button" role="tab" aria-selected={activeTab === 'smtp'} onClick={() => setActiveTab('smtp')} className={`border-b-2 px-3 py-3 text-sm font-semibold ${activeTab === 'smtp' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}><Server aria-hidden="true" className="mr-2 inline" size={16} />SMTP</button><button type="button" role="tab" aria-selected={activeTab === 'templates'} onClick={() => setActiveTab('templates')} className={`border-b-2 px-3 py-3 text-sm font-semibold ${activeTab === 'templates' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}><FileText aria-hidden="true" className="mr-2 inline" size={16} />Templates de e-mail <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">{system.templates.length}</span></button></div>{activeTab === 'smtp' ? <SmtpPanel smtp={system.smtp} onSaved={refresh} /> : <TemplatesPanel templates={system.templates} onSaved={refresh} />}</div>;
}
