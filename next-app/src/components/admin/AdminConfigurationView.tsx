'use client';

import { Check, CreditCard, LoaderCircle, Pencil, Plus, Save, Settings2, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type {
  AdminArea,
  AdminBusinessHour,
  AdminConfiguration,
  AdminShift,
  AdminTable,
  AdminTableType,
} from '@/modules/admin/application/ports';

type ConfigResource = 'area' | 'table_type' | 'table' | 'shift' | 'business_hour';
type ConfigItem = AdminArea | AdminTableType | AdminTable | AdminShift | AdminBusinessHour;
type SaveForm = (resource: ConfigResource, form: HTMLFormElement, id?: number) => Promise<void>;
type EditingItem = { resource: ConfigResource; id: number } | null;

const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const shapes = [['retangular', 'Retangular'], ['redonda', 'Redonda'], ['quadrada', 'Quadrada'], ['balcao', 'Balcão']];

function text(form: FormData, field: string): string { return String(form.get(field) ?? ''); }
function number(form: FormData, field: string): number { return Number(form.get(field) ?? 0); }

function buildPayload(resource: ConfigResource, form: FormData, id?: number): unknown {
  const common = id ? { resource, id } : { resource };
  if (resource === 'area') return { ...common, code: text(form, 'code'), name: text(form, 'name') };
  if (resource === 'table_type') return { ...common, code: text(form, 'code'), name: text(form, 'name'), capacityMin: number(form, 'capacityMin'), capacityMax: number(form, 'capacityMax') };
  if (resource === 'table') return { ...common, code: text(form, 'code'), name: text(form, 'name'), areaId: number(form, 'areaId'), tableTypeId: number(form, 'tableTypeId'), capacityMin: number(form, 'capacityMin'), capacityMax: number(form, 'capacityMax'), shape: text(form, 'shape'), joinable: form.get('joinable') === 'on' };
  if (resource === 'shift') return { ...common, code: text(form, 'code'), name: text(form, 'name'), startsAt: text(form, 'startsAt'), endsAt: text(form, 'endsAt') };
  return { ...common, dayOfWeek: number(form, 'dayOfWeek'), shiftId: number(form, 'shiftId'), opensAt: text(form, 'opensAt'), closesAt: text(form, 'closesAt') };
}

function ConfigForm({ resource, title, children, onSubmit, isSaving }: { resource: ConfigResource; title: string; children: React.ReactNode; onSubmit: SaveForm; isSaving: boolean }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void onSubmit(resource, event.currentTarget); };
  return <form onSubmit={submit} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><h3 className="font-display text-2xl text-foreground">{title}</h3><div className="mt-4 space-y-3">{children}</div><button type="submit" disabled={isSaving} className="admin-primary-button mt-5"><Plus aria-hidden="true" size={16} /> {isSaving ? 'Salvando...' : 'Adicionar'}</button></form>;
}

function Field({ label, name, type = 'text', placeholder, defaultValue }: { label: string; name: string; type?: string; placeholder?: string; defaultValue?: string | number }) {
  return <label className="block"><span className="admin-label">{label}</span><input name={name} type={type} required placeholder={placeholder} defaultValue={defaultValue} min={type === 'number' ? 1 : undefined} className="admin-input" /></label>;
}

function CapacityFields({ item }: { item?: AdminTableType | AdminTable }) {
  return <div className="grid grid-cols-2 gap-3"><Field label="Capacidade mínima" name="capacityMin" type="number" placeholder="1" defaultValue={item?.capacityMin} /><Field label="Capacidade máxima" name="capacityMax" type="number" placeholder="4" defaultValue={item?.capacityMax} /></div>;
}

function SelectField({ label, name, options, defaultValue }: { label: string; name: string; options: Array<{ value: string | number; label: string }>; defaultValue?: string | number }) {
  return <label className="block"><span className="admin-label">{label}</span><select name={name} required defaultValue={defaultValue} className="admin-input">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function AreaFields({ item }: { item?: AdminArea }) {
  return <><Field label="Código" name="code" placeholder="salao-principal" defaultValue={item?.code} /><Field label="Nome" name="name" placeholder="Salão principal" defaultValue={item?.name} /></>;
}

function TableTypeFields({ item }: { item?: AdminTableType }) {
  return <><Field label="Código" name="code" placeholder="mesa-4" defaultValue={item?.code} /><Field label="Nome" name="name" placeholder="Mesa para quatro" defaultValue={item?.name} /><CapacityFields item={item} /></>;
}

function TableFields({ item, configuration }: { item?: AdminTable; configuration: AdminConfiguration }) {
  return <><Field label="Código" name="code" placeholder="m01" defaultValue={item?.code} /><Field label="Nome" name="name" placeholder="Mesa 01" defaultValue={item?.name} /><div className="grid grid-cols-2 gap-3"><SelectField label="Área" name="areaId" options={configuration.areas.map((area) => ({ value: area.id, label: area.name }))} defaultValue={item?.areaId} /><SelectField label="Tipo" name="tableTypeId" options={configuration.tableTypes.map((type) => ({ value: type.id, label: type.name }))} defaultValue={item?.tableTypeId} /></div><CapacityFields item={item} /><SelectField label="Formato" name="shape" options={shapes.map(([value, label]) => ({ value, label }))} defaultValue={item?.shape} /><label className="flex items-center gap-2 text-sm text-muted"><input name="joinable" type="checkbox" defaultChecked={item?.joinable} className="reservation-checkbox" /> Pode participar de combinações</label></>;
}

function ShiftFields({ item }: { item?: AdminShift }) {
  return <><Field label="Código" name="code" placeholder="jantar" defaultValue={item?.code} /><Field label="Nome" name="name" placeholder="Jantar" defaultValue={item?.name} /><div className="grid grid-cols-2 gap-3"><Field label="Início" name="startsAt" type="time" defaultValue={item?.startsAt} /><Field label="Fim" name="endsAt" type="time" defaultValue={item?.endsAt} /></div></>;
}

function BusinessHourFields({ item, configuration }: { item?: AdminBusinessHour; configuration: AdminConfiguration }) {
  return <><SelectField label="Dia da semana" name="dayOfWeek" options={days.map((day, index) => ({ value: index, label: day }))} defaultValue={item?.dayOfWeek} /><SelectField label="Turno" name="shiftId" options={configuration.shifts.map((shift) => ({ value: shift.id, label: shift.name }))} defaultValue={item?.shiftId} /><div className="grid grid-cols-2 gap-3"><Field label="Abertura" name="opensAt" type="time" defaultValue={item?.opensAt} /><Field label="Fechamento" name="closesAt" type="time" defaultValue={item?.closesAt} /></div></>;
}

function ConfigurationFields({ resource, item, configuration }: { resource: ConfigResource; item?: ConfigItem; configuration: AdminConfiguration }) {
  switch (resource) {
    case 'area': return <AreaFields item={item as AdminArea | undefined} />;
    case 'table_type': return <TableTypeFields item={item as AdminTableType | undefined} />;
    case 'table': return <TableFields item={item as AdminTable | undefined} configuration={configuration} />;
    case 'shift': return <ShiftFields item={item as AdminShift | undefined} />;
    case 'business_hour': return <BusinessHourFields item={item as AdminBusinessHour | undefined} configuration={configuration} />;
  }
}

function ConfigEditor({ resource, item, configuration, onSubmit, onCancel, isSaving }: { resource: ConfigResource; item: ConfigItem; configuration: AdminConfiguration; onSubmit: SaveForm; onCancel: () => void; isSaving: boolean }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void onSubmit(resource, event.currentTarget, item.id); };
  return <form onSubmit={submit} className="rounded-[var(--radius-sm)] border border-primary/30 bg-primary/5 p-3"><div className="space-y-3"><ConfigurationFields resource={resource} item={item} configuration={configuration} /></div><div className="mt-4 flex flex-wrap gap-2"><button type="submit" disabled={isSaving} className="admin-primary-button"><Save aria-hidden="true" size={15} /> {isSaving ? 'Salvando...' : 'Salvar'}</button><button type="button" onClick={onCancel} className="admin-secondary-button"><X aria-hidden="true" size={15} /> Cancelar</button></div></form>;
}

function itemSummary(resource: ConfigResource, item: ConfigItem): { title: string; detail: string } {
  if (resource === 'area') return { title: (item as AdminArea).name, detail: (item as AdminArea).code };
  if (resource === 'table_type') { const type = item as AdminTableType; return { title: type.name, detail: `${type.capacityMin}–${type.capacityMax} lugares · ${type.code}` }; }
  if (resource === 'table') { const table = item as AdminTable; return { title: table.name, detail: `${table.areaName} · ${table.capacityMin}–${table.capacityMax} lugares` }; }
  if (resource === 'shift') { const shift = item as AdminShift; return { title: shift.name, detail: `${shift.startsAt}–${shift.endsAt} · ${shift.code}` }; }
  const hour = item as AdminBusinessHour;
  return { title: `${days[hour.dayOfWeek]} · ${hour.shiftName}`, detail: `${hour.opensAt}–${hour.closesAt}` };
}

function ConfigList({ title, resource, items, configuration, editing, onEdit, onCancel, onRemove, onSubmit, isSaving }: { title: string; resource: ConfigResource; items: ConfigItem[]; configuration: AdminConfiguration; editing: EditingItem; onEdit: (resource: ConfigResource, id: number) => void; onCancel: () => void; onRemove: (resource: ConfigResource, id: number) => void; onSubmit: SaveForm; isSaving: string | null }) {
  return <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl text-foreground">{title}</h3><span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-muted">{items.length}</span></div>{items.length === 0 ? <p className="mt-4 text-sm text-muted">Ainda não há registros ativos.</p> : <div className="mt-4 divide-y divide-border">{items.map((item) => { const summary = itemSummary(resource, item); const isEditing = editing?.resource === resource && editing.id === item.id; return <div key={item.id} className="py-3">{isEditing ? <ConfigEditor resource={resource} item={item} configuration={configuration} onSubmit={onSubmit} onCancel={onCancel} isSaving={isSaving === `edit:${resource}:${item.id}`} /> : <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-foreground">{summary.title}</p><p className="mt-1 text-xs text-muted">{summary.detail}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => onEdit(resource, item.id)} className="admin-secondary-button px-2.5 py-2" aria-label={`Editar ${summary.title}`}><Pencil aria-hidden="true" size={14} /> <span className="hidden sm:inline">Editar</span></button><button type="button" onClick={() => onRemove(resource, item.id)} disabled={isSaving !== null} className="admin-secondary-button px-2.5 py-2 text-status-danger hover:border-status-danger hover:text-status-danger" aria-label={`Remover ${summary.title}`}><Trash2 aria-hidden="true" size={14} /> <span className="hidden sm:inline">Remover</span></button></div></div>}</div>; })}</div>}</section>;
}

export function AdminConfigurationView({ initialConfiguration }: { initialConfiguration: AdminConfiguration }) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingItem>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = async () => {
    const response = await fetch('/api/admin/configuration');
    if (response.ok) setConfiguration(await response.json() as AdminConfiguration);
  };

  const submit = async (resource: ConfigResource, formElement: HTMLFormElement, id?: number) => {
    const key = id ? `edit:${resource}:${id}` : `new:${resource}`;
    setBusyKey(key); setMessage(''); setError('');
    const response = await fetch('/api/admin/configuration', { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(resource, new FormData(formElement), id)) });
    if (!response.ok) {
      setError(response.status === 409 ? 'Este código ou horário já existe.' : response.status === 400 ? 'Confira os dados e as referências selecionadas.' : 'Não foi possível salvar a configuração.');
      setBusyKey(null);
      return;
    }
    await refresh();
    formElement.reset();
    setEditing(null);
    setMessage(id ? 'Cadastro atualizado.' : 'Configuração salva.');
    setBusyKey(null);
  };

  const remove = async (resource: ConfigResource, id: number) => {
    if (!window.confirm('Remover este cadastro da operação? O histórico será preservado.')) return;
    setBusyKey(`remove:${resource}:${id}`); setMessage(''); setError('');
    const response = await fetch('/api/admin/configuration', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource, id }) });
    if (!response.ok) { setError(response.status === 404 ? 'Esse cadastro já foi removido.' : 'Não foi possível remover. Verifique se o registro está em uso.'); setBusyKey(null); return; }
    await refresh();
    setMessage('Cadastro removido da operação.');
    setBusyKey(null);
  };

  return <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Operação</p><h1 className="mt-2 font-display text-4xl text-foreground">Configuração do salão</h1><p className="mt-2 max-w-2xl text-sm text-muted">Cadastre a estrutura usada pelo motor de disponibilidade da página pública.</p></header>{busyKey && <p className="mt-5 flex items-center gap-2 text-sm text-muted"><LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Processando cadastro...</p>}{message && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-status-success"><Check aria-hidden="true" size={16} /> {message}</p>}{error && <p role="alert" className="mt-5 text-sm text-status-danger">{error}</p>}

    <section className="mt-6 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-5" aria-labelledby="payment-demo-title"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><CreditCard aria-hidden="true" className="mt-0.5 text-primary" size={20} /><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pagamentos</p><h2 id="payment-demo-title" className="mt-1 font-display text-2xl text-foreground">Modo demonstrativo ativo</h2></div></div><span className="rounded-full border border-primary/30 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-primary">MOCK</span></div><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">O fluxo público apresenta Pix e cartão simulados para validação da experiência. Nenhuma cobrança ou chamada ao Mercado Pago é feita neste ambiente.</p></section>

    <div className="mt-8 grid gap-5 xl:grid-cols-2"><ConfigForm resource="area" title="Nova área" onSubmit={submit} isSaving={busyKey === 'new:area'}><ConfigurationFields resource="area" configuration={configuration} /></ConfigForm><ConfigForm resource="table_type" title="Novo tipo de mesa" onSubmit={submit} isSaving={busyKey === 'new:table_type'}><ConfigurationFields resource="table_type" configuration={configuration} /></ConfigForm><ConfigForm resource="table" title="Nova mesa" onSubmit={submit} isSaving={busyKey === 'new:table'}><ConfigurationFields resource="table" configuration={configuration} /></ConfigForm><ConfigForm resource="shift" title="Novo turno" onSubmit={submit} isSaving={busyKey === 'new:shift'}><ConfigurationFields resource="shift" configuration={configuration} /></ConfigForm><ConfigForm resource="business_hour" title="Horário por dia" onSubmit={submit} isSaving={busyKey === 'new:business_hour'}><ConfigurationFields resource="business_hour" configuration={configuration} /></ConfigForm></div>

    <div className="mt-8 grid gap-5 xl:grid-cols-2"><ConfigList title="Áreas cadastradas" resource="area" items={configuration.areas} configuration={configuration} editing={editing} onEdit={(resource, id) => setEditing({ resource, id })} onCancel={() => setEditing(null)} onRemove={remove} onSubmit={submit} isSaving={busyKey} /><ConfigList title="Tipos de mesa" resource="table_type" items={configuration.tableTypes} configuration={configuration} editing={editing} onEdit={(resource, id) => setEditing({ resource, id })} onCancel={() => setEditing(null)} onRemove={remove} onSubmit={submit} isSaving={busyKey} /><ConfigList title="Mesas" resource="table" items={configuration.tables} configuration={configuration} editing={editing} onEdit={(resource, id) => setEditing({ resource, id })} onCancel={() => setEditing(null)} onRemove={remove} onSubmit={submit} isSaving={busyKey} /><ConfigList title="Turnos" resource="shift" items={configuration.shifts} configuration={configuration} editing={editing} onEdit={(resource, id) => setEditing({ resource, id })} onCancel={() => setEditing(null)} onRemove={remove} onSubmit={submit} isSaving={busyKey} /><ConfigList title="Horários por dia" resource="business_hour" items={configuration.businessHours} configuration={configuration} editing={editing} onEdit={(resource, id) => setEditing({ resource, id })} onCancel={() => setEditing(null)} onRemove={remove} onSubmit={submit} isSaving={busyKey} /></div><p className="mt-8 flex items-center gap-2 text-xs text-muted"><Settings2 aria-hidden="true" size={15} /> Combinações de mesas e bloqueios permanecem no mapa do salão.</p></div>;
}
