'use client';

import { Bell, Check, Clock3, LoaderCircle, Mail, Play, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { NotificationOutboxEntry } from '@/modules/notifications/application/ports';

const statusLabels: Record<NotificationOutboxEntry['status'], string> = {
  pending: 'Pendente',
  processing: 'Processando',
  sent: 'Simulado como enviado',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

const templateLabels: Record<NotificationOutboxEntry['template'], string> = {
  reservation_confirmation: 'Confirmação de reserva',
  reservation_payment_pending: 'Reserva aguardando pagamento',
  reservation_reminder_24h: 'Lembrete de 24 horas',
  reservation_reminder_3h: 'Lembrete de 3 horas',
  reservation_cancellation: 'Cancelamento de reserva',
  waitlist_available: 'Mesa disponível',
};

function StatusIcon({ status }: { status: NotificationOutboxEntry['status'] }) {
  if (status === 'sent') return <Check aria-hidden="true" size={16} />;
  if (status === 'failed') return <XCircle aria-hidden="true" size={16} />;
  if (status === 'processing') return <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />;
  return <Clock3 aria-hidden="true" size={16} />;
}

function statusClass(status: NotificationOutboxEntry['status']): string {
  if (status === 'sent') return 'border-status-success/30 bg-status-success/10 text-status-success';
  if (status === 'failed') return 'border-status-danger/30 bg-status-danger/10 text-status-danger';
  if (status === 'processing') return 'border-status-warning/30 bg-status-warning/10 text-status-warning';
  return 'border-border bg-surface-muted text-muted';
}

function NotificationRow({ notification, onSimulate }: { notification: NotificationOutboxEntry; onSimulate: (id: number) => Promise<void> }) {
  const canSimulate = notification.status === 'pending' || notification.status === 'failed';
  return (
    <tr className="border-b border-border align-top last:border-0">
      <td className="px-4 py-4"><span className="font-semibold text-foreground">#{notification.id}</span><span className="mt-1 block text-xs text-muted">{notification.scheduledAt}</span></td>
      <td className="px-4 py-4"><span className="font-medium text-foreground">{templateLabels[notification.template]}</span><span className="mt-1 block text-xs text-muted">{notification.channel}</span></td>
      <td className="px-4 py-4"><span className="block max-w-64 truncate text-sm text-foreground">{notification.recipient}</span><span className="mt-1 block text-xs text-muted">{notification.attempts} tentativa(s)</span></td>
      <td className="px-4 py-4"><span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(notification.status)}`}><StatusIcon status={notification.status} /> {statusLabels[notification.status]}</span>{notification.lastError && <span className="mt-2 block max-w-64 text-xs text-status-danger">{notification.lastError}</span>}{canSimulate && <button type="button" onClick={() => void onSimulate(notification.id)} className="admin-secondary-button mt-3"><RotateCcw aria-hidden="true" size={14} /> Simular envio</button>}</td>
    </tr>
  );
}

export function AdminNotificationsView({ initialNotifications }: { initialNotifications: NotificationOutboxEntry[] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [runMessage, setRunMessage] = useState('');

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/notifications');
      if (!response.ok) throw new Error('refresh_failed');
      setNotifications((await response.json()).notifications as NotificationOutboxEntry[]);
    } catch {
      setError('Não foi possível atualizar a fila de notificações.');
    } finally {
      setIsLoading(false);
    }
  };

  const simulate = async (id: number) => {
    setError('');
    const response = await fetch(`/api/admin/notifications/${id}/simulate`, { method: 'POST' });
    if (!response.ok) {
      setError('Não foi possível simular o envio desta notificação.');
      return;
    }
    await refresh();
  };

  const runReminders = async () => {
    setIsRunning(true);
    setError('');
    setRunMessage('');
    try {
      const response = await fetch('/api/admin/notifications/reminders', { method: 'POST' });
      if (!response.ok) throw new Error('reminder_cycle_failed');
      const result = await response.json() as { scanned: number; scheduled: number };
      setRunMessage(`Ciclo concluído: ${result.scheduled} lembrete(s) enfileirado(s) de ${result.scanned} reserva(s) analisada(s).`);
      await refresh();
    } catch {
      setError('Não foi possível executar o ciclo de lembretes.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Comunicação</p><h1 className="mt-2 font-display text-4xl text-foreground">Notificações</h1><p className="mt-2 text-sm text-muted">Acompanhe a fila de e-mails sem disparar serviços externos.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void runReminders()} disabled={isRunning} className="admin-primary-button">{isRunning ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <Play aria-hidden="true" size={16} />} Executar lembretes</button><button type="button" onClick={() => void refresh()} disabled={isLoading} className="admin-secondary-button">{isLoading ? <LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> : <RefreshCw aria-hidden="true" size={16} />} Atualizar fila</button></div></header>
      <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4 text-sm text-foreground"><Bell aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={18} /><p><strong>Modo demonstrativo.</strong> As notificações ficam registradas na outbox e a ação “Simular envio” apenas altera o estado local. Nenhum e-mail é enviado enquanto o provedor não for definido.</p></div>
      {error && <p role="alert" className="mt-5 rounded-[var(--radius-sm)] border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">{error}</p>}
      {runMessage && <p role="status" className="mt-5 rounded-[var(--radius-sm)] border border-status-success/30 bg-status-success/10 p-3 text-sm text-status-success">{runMessage}</p>}
      <section className="mt-8 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><Mail aria-hidden="true" className="text-primary" size={20} /><div><h2 className="font-display text-2xl text-foreground">Outbox</h2><p className="mt-1 text-xs text-muted">Eventos recentes de confirmação e cancelamento.</p></div></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{notifications.length}</span></div>
        {notifications.length === 0 ? <p className="px-6 py-14 text-center text-sm text-muted">Nenhuma notificação registrada ainda.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-surface-muted text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3 font-semibold">ID / agenda</th><th className="px-4 py-3 font-semibold">Evento</th><th className="px-4 py-3 font-semibold">Destinatário</th><th className="px-4 py-3 font-semibold">Status / ação</th></tr></thead><tbody>{notifications.map((notification) => <NotificationRow key={notification.id} notification={notification} onSimulate={simulate} />)}</tbody></table></div>}
      </section>
    </div>
  );
}
