'use client';

import { Check, LoaderCircle, Plus, Settings2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AdminConfiguration } from '@/modules/admin/application/ports';

type ConfigResource = 'area' | 'table_type' | 'table' | 'shift' | 'business_hour';
type SubmitForm = (resource: ConfigResource, form: HTMLFormElement) => Promise<void>;

const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const shapes = [['retangular', 'Retangular'], ['redonda', 'Redonda'], ['quadrada', 'Quadrada'], ['balcao', 'Balcão']];

function text(form: FormData, field: string): string { return String(form.get(field) ?? ''); }
function number(form: FormData, field: string): number { return Number(form.get(field) ?? 0); }

function buildPayload(resource: ConfigResource, form: FormData): unknown {
  if (resource === 'area') return { resource, code: text(form, 'code'), name: text(form, 'name') };
  if (resource === 'table_type') return { resource, code: text(form, 'code'), name: text(form, 'name'), capacityMin: number(form, 'capacityMin'), capacityMax: number(form, 'capacityMax') };
  if (resource === 'table') return { resource, code: text(form, 'code'), name: text(form, 'name'), areaId: number(form, 'areaId'), tableTypeId: number(form, 'tableTypeId'), capacityMin: number(form, 'capacityMin'), capacityMax: number(form, 'capacityMax'), shape: text(form, 'shape'), joinable: form.get('joinable') === 'on' };
  if (resource === 'shift') return { resource, code: text(form, 'code'), name: text(form, 'name'), startsAt: text(form, 'startsAt'), endsAt: text(form, 'endsAt') };
  return { resource, dayOfWeek: number(form, 'dayOfWeek'), shiftId: number(form, 'shiftId'), opensAt: text(form, 'opensAt'), closesAt: text(form, 'closesAt') };
}

function ConfigForm({ resource, title, children, onSubmit }: { resource: ConfigResource; title: string; children: React.ReactNode; onSubmit: SubmitForm }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void onSubmit(resource, event.currentTarget); };
  return <form onSubmit={submit} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><h3 className="font-display text-2xl text-foreground">{title}</h3><div className="mt-4 space-y-3">{children}</div><button type="submit" className="admin-primary-button mt-5"><Plus aria-hidden="true" size={16} /> Adicionar</button></form>;
}

function Field({ label, name, type = 'text', placeholder }: { label: string; name: string; type?: string; placeholder?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span><input name={name} type={type} required placeholder={placeholder} min={type === 'number' ? 1 : undefined} className="admin-input" /></label>;
}

function CapacityFields() {
  return <div className="grid grid-cols-2 gap-3"><Field label="Capacidade mínima" name="capacityMin" type="number" placeholder="1" /><Field label="Capacidade máxima" name="capacityMax" type="number" placeholder="4" /></div>;
}

function ConfigList({ title, children, empty }: { title: string; children: React.ReactNode; empty: boolean }) {
  return <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><h3 className="font-display text-2xl text-foreground">{title}</h3>{empty ? <p className="mt-4 text-sm text-muted">Ainda não há registros.</p> : <div className="mt-4 divide-y divide-border">{children}</div>}</section>;
}

export function AdminConfigurationView({ initialConfiguration }: { initialConfiguration: AdminConfiguration }) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (resource: ConfigResource, formElement: HTMLFormElement) => {
    setIsSaving(true);
    setMessage('');
    setError('');
    const response = await fetch('/api/admin/configuration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(resource, new FormData(formElement))) });
    if (!response.ok) {
      setError(response.status === 409 ? 'Este código ou horário já existe.' : 'Não foi possível salvar a configuração.');
      setIsSaving(false);
      return;
    }
    const refreshed = await fetch('/api/admin/configuration');
    if (refreshed.ok) setConfiguration(await refreshed.json() as AdminConfiguration);
    formElement.reset();
    setMessage('Configuração salva.');
    setIsSaving(false);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Operação</p><h1 className="mt-2 font-display text-4xl text-foreground">Configuração do salão</h1><p className="mt-2 max-w-2xl text-sm text-muted">Cadastre a estrutura usada pelo motor de disponibilidade da página pública.</p></header>
      {isSaving && <p className="mt-5 flex items-center gap-2 text-sm text-muted"><LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Salvando configuração...</p>}
      {message && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-status-success"><Check aria-hidden="true" size={16} /> {message}</p>}
      {error && <p role="alert" className="mt-5 text-sm text-status-danger">{error}</p>}

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <ConfigForm resource="area" title="Nova área" onSubmit={submit}><Field label="Código" name="code" placeholder="salao-principal" /><Field label="Nome" name="name" placeholder="Salão principal" /></ConfigForm>
        <ConfigForm resource="table_type" title="Novo tipo de mesa" onSubmit={submit}><Field label="Código" name="code" placeholder="mesa-4" /><Field label="Nome" name="name" placeholder="Mesa para quatro" /><CapacityFields /></ConfigForm>
        <ConfigForm resource="table" title="Nova mesa" onSubmit={submit}>
          <Field label="Código" name="code" placeholder="m01" /><Field label="Nome" name="name" placeholder="Mesa 01" />
          <div className="grid grid-cols-2 gap-3"><label className="block"><span className="admin-label">Área</span><select name="areaId" required className="admin-input">{configuration.areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label><label className="block"><span className="admin-label">Tipo</span><select name="tableTypeId" required className="admin-input">{configuration.tableTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label></div>
          <CapacityFields /><label className="block"><span className="admin-label">Formato</span><select name="shape" className="admin-input">{shapes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex items-center gap-2 text-sm text-muted"><input name="joinable" type="checkbox" className="reservation-checkbox" /> Pode participar de combinações</label>
        </ConfigForm>
        <ConfigForm resource="shift" title="Novo turno" onSubmit={submit}><Field label="Código" name="code" placeholder="jantar" /><Field label="Nome" name="name" placeholder="Jantar" /><div className="grid grid-cols-2 gap-3"><Field label="Início" name="startsAt" type="time" /><Field label="Fim" name="endsAt" type="time" /></div></ConfigForm>
        <ConfigForm resource="business_hour" title="Horário por dia" onSubmit={submit}><label className="block"><span className="admin-label">Dia da semana</span><select name="dayOfWeek" className="admin-input">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><label className="block"><span className="admin-label">Turno</span><select name="shiftId" required className="admin-input">{configuration.shifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><Field label="Abertura" name="opensAt" type="time" /><Field label="Fechamento" name="closesAt" type="time" /></div></ConfigForm>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <ConfigList title="Áreas cadastradas" empty={configuration.areas.length === 0}>{configuration.areas.map((area) => <p key={area.id} className="flex justify-between gap-3 py-3 text-sm"><span className="font-medium text-foreground">{area.name}</span><span className="text-muted">{area.code}</span></p>)}</ConfigList>
        <ConfigList title="Tipos de mesa" empty={configuration.tableTypes.length === 0}>{configuration.tableTypes.map((type) => <p key={type.id} className="flex justify-between gap-3 py-3 text-sm"><span className="font-medium text-foreground">{type.name}</span><span className="text-muted">{type.capacityMin}–{type.capacityMax} lugares</span></p>)}</ConfigList>
        <ConfigList title="Mesas" empty={configuration.tables.length === 0}>{configuration.tables.map((table) => <p key={table.id} className="flex justify-between gap-3 py-3 text-sm"><span className="font-medium text-foreground">{table.name} <span className="font-normal text-muted">· {table.areaName}</span></span><span className="text-muted">{table.capacityMin}–{table.capacityMax}</span></p>)}</ConfigList>
        <ConfigList title="Turnos e horários" empty={configuration.businessHours.length === 0}>{configuration.businessHours.map((hour) => <p key={hour.id} className="flex justify-between gap-3 py-3 text-sm"><span className="font-medium text-foreground">{days[hour.dayOfWeek]} · {hour.shiftName}</span><span className="text-muted">{hour.opensAt}–{hour.closesAt}</span></p>)}</ConfigList>
      </div>
      <p className="mt-8 flex items-center gap-2 text-xs text-muted"><Settings2 aria-hidden="true" size={15} /> Combinações de mesas e bloqueios entram na próxima extensão do mapa do salão.</p>
    </div>
  );
}
