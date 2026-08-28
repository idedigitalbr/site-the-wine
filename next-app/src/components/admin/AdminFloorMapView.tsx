'use client';

/* User-provided HTTPS images cannot be statically optimized by Next Image. */
/* eslint-disable @next/next/no-img-element */

import { Background, Controls, Handle, MiniMap, Position, ReactFlow, useEdgesState, useNodesState, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Ban, Check, Clock3, Grip, ImagePlus, LoaderCircle, MapPin, MousePointerClick, Plus, Table2, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  AdminArea,
  AdminBlockedPeriod,
  AdminCombination,
  AdminFloorMap,
  AdminFloorPlanSettings,
  AdminTable,
  FloorTable,
} from '@/modules/admin/application/ports';

const stateLabels = { available: 'Livre', reserved: 'Reservada', blocked: 'Bloqueada' } as const;
const stateClasses = { available: 'border-emerald-400 bg-emerald-50 text-emerald-800', reserved: 'border-amber-400 bg-amber-50 text-amber-800', blocked: 'border-red-400 bg-red-50 text-red-800' } as const;

function displayPosition(table: FloorTable, index: number): { x: number; y: number } {
  const positionIsInsideCanvas = table.positionX >= 4 && table.positionX <= 96
    && table.positionY >= 8 && table.positionY <= 92;
  if (positionIsInsideCanvas) return { x: table.positionX, y: table.positionY };
  return { x: 12 + (index % 4) * 24, y: 16 + Math.floor(index / 4) * 24 };
}

type TableNodeData = { table: FloorTable; selected: boolean };
type TableNode = Node<TableNodeData, 'table'>;

function TableNodeCard({ data }: NodeProps<TableNode>) {
  const { table, selected } = data;
  const selectedClass = selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : '';
  return <div role="button" tabIndex={0} aria-label={`${table.name} · ${stateLabels[table.state]}${selected ? ' · selecionada para combinação' : ''}`} title={`${table.name} · ${stateLabels[table.state]}`} className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-[var(--radius-sm)] border-2 p-1.5 text-center shadow-sm transition hover:scale-105 sm:h-20 sm:w-24 sm:p-2 ${stateClasses[table.state]} ${selectedClass}`}><Handle type="target" position={Position.Top} className="!h-1 !w-1 !border-0 !bg-transparent" /><Grip aria-hidden="true" size={15} className="mb-1 opacity-50" /><span className="text-[11px] font-bold leading-tight sm:text-xs">{table.name}</span><span className="mt-1 text-[9px] leading-tight sm:text-[10px]">{table.capacityMin}–{table.capacityMax} lugares</span><Handle type="source" position={Position.Bottom} className="!h-1 !w-1 !border-0 !bg-transparent" /></div>;
}

const nodeTypes = { table: TableNodeCard };

function floorNodes(tables: FloorTable[], selectedTableIds: number[]): TableNode[] {
  const selected = new Set(selectedTableIds);
  return tables.map((table, index) => {
    const position = displayPosition(table, index);
    return { id: String(table.id), type: 'table', position: { x: position.x * 10, y: position.y * 5 }, data: { table, selected: selected.has(table.id) }, draggable: true };
  });
}

function combinationEdges(combinations: AdminCombination[]): Edge[] {
  return combinations.flatMap((combination) => combination.tableIds.slice(1).map((tableId, index) => ({
    id: `combination-${combination.id}-${index}`,
    source: String(combination.tableIds[index]),
    target: String(tableId),
    type: 'smoothstep',
    style: { stroke: '#b18a49', strokeWidth: 2, strokeDasharray: '5 4' },
    label: combination.name,
    labelStyle: { fill: '#80602d', fontSize: 10 },
    labelBgStyle: { fill: '#f8f6f1', fillOpacity: 0.9 },
  })));
}

function FloorMapCanvas({ tables, combinations, background, selectedTableIds, onPositionChange, onTableToggle }: { tables: FloorTable[]; combinations: AdminCombination[]; background: AdminFloorPlanSettings; selectedTableIds: number[]; onPositionChange: (id: number, x: number, y: number) => Promise<void>; onTableToggle: (id: number) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<TableNode>(floorNodes(tables, selectedTableIds));
  const [edges, setEdges, onEdgesChange] = useEdgesState(combinationEdges(combinations));
  const hasBackground = Boolean(background.url);

  useEffect(() => {
    setNodes(floorNodes(tables, selectedTableIds));
    setEdges(combinationEdges(combinations));
  }, [tables, combinations, selectedTableIds, setEdges, setNodes]);

  const onNodeDragStop = async (_event: unknown, node: TableNode) => {
    const x = Math.min(96, Math.max(4, node.position.x / 10));
    const y = Math.min(92, Math.max(8, node.position.y / 5));
    await onPositionChange(Number(node.id), Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  if (tables.length === 0) return <div className="flex min-h-[430px] items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border-strong text-sm text-muted">Cadastre mesas para iniciar o mapa.</div>;

  return <div className="relative h-[430px] overflow-hidden rounded-[var(--radius-md)] border border-dashed border-border-strong bg-[var(--surface-muted)] sm:h-[520px]">
    {background.url && <img src={background.url} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover" style={{ opacity: background.opacity }} />}
    <div role="img" aria-label={hasBackground ? 'Planta operacional com fundo do restaurante' : 'Planta operacional com grade de posicionamento'} className="relative z-10 h-full">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={(_event, node) => onTableToggle(Number(node.id))} onNodeDragStop={onNodeDragStop} nodeOrigin={[0.5, 0.5]} fitView fitViewOptions={{ padding: 0.18 }} minZoom={0.5} maxZoom={2} nodesConnectable={false} proOptions={{ hideAttribution: true }} className="!bg-transparent"><Background color={hasBackground ? 'rgba(169,132,69,.10)' : 'rgba(169,132,69,.16)'} gap={32} size={1} /><Controls showInteractive={false} /><MiniMap pannable zoomable nodeColor={(node) => { const table = (node.data as TableNodeData).table; return table.state === 'available' ? '#10b981' : table.state === 'reserved' ? '#f59e0b' : '#ef4444'; }} /></ReactFlow>
    </div>
  </div>;
}

function StateLegend() {
  return <div className="flex flex-wrap gap-4 text-xs text-muted">{Object.entries(stateLabels).map(([state, label]) => <span key={state} className="flex items-center gap-2"><i className={`h-3 w-3 rounded-full ${state === 'available' ? 'bg-emerald-500' : state === 'reserved' ? 'bg-amber-500' : 'bg-red-500'}`} /> {label}</span>)}</div>;
}

function CombinationForm({ tables, selectedTableIds, onToggleTable, onClearSelection, onCreate }: { tables: AdminTable[]; selectedTableIds: number[]; onToggleTable: (id: number) => void; onClearSelection: () => void; onCreate: (payload: unknown) => Promise<boolean> }) {
  const joinableTables = tables.filter((table) => table.joinable);
  const selectedTables = joinableTables.filter((table) => selectedTableIds.includes(table.id));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const created = await onCreate({ resource: 'combination', code: String(form.get('code') ?? ''), name: String(form.get('name') ?? ''), tableIds: selectedTableIds });
    if (created) { formElement.reset(); onClearSelection(); }
  };
  return <form onSubmit={submit} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl text-foreground">Nova combinação</h2><p className="mt-1 text-xs text-muted">Agrupe mesas que podem receber um mesmo grupo.</p></div>{selectedTableIds.length > 0 && <button type="button" onClick={onClearSelection} className="admin-text-button">Limpar seleção</button>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block"><span className="admin-label">Código interno</span><input name="code" required className="admin-input" placeholder="m09-m10" /></label><label className="block"><span className="admin-label">Nome exibido</span><input name="name" required className="admin-input" placeholder="Mesas 09 e 10" /></label></div><div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-[var(--surface-muted)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="admin-label mb-0">Mesas participantes</p><span className="text-xs font-semibold text-primary">{selectedTableIds.length} selecionada(s)</span></div><p className="mt-2 flex items-center gap-2 text-xs text-muted"><MousePointerClick aria-hidden="true" size={14} /> Clique nas mesas da planta ou marque abaixo.</p><div className="mt-3 grid max-h-36 gap-2 overflow-y-auto sm:grid-cols-2">{joinableTables.map((table) => <label key={table.id} className={`flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-2 py-2 text-sm transition ${selectedTableIds.includes(table.id) ? 'border-primary bg-primary/10 text-foreground' : 'border-transparent text-muted hover:border-border-strong'}`}><input type="checkbox" checked={selectedTableIds.includes(table.id)} onChange={() => onToggleTable(table.id)} className="reservation-checkbox" /> {table.name}<span className="ml-auto text-[10px]">{table.capacityMax} lugares</span></label>)}</div>{selectedTables.length > 0 && <p className="mt-3 text-xs text-muted">Seleção: {selectedTables.map((table) => table.name).join(' · ')}</p>}</div><button type="submit" disabled={selectedTableIds.length < 2} className="admin-primary-button mt-5 disabled:cursor-not-allowed disabled:opacity-50"><Plus aria-hidden="true" size={16} /> Adicionar combinação</button></form>;
}

function FloorPlanBackgroundForm({ settings, onSave }: { settings: AdminFloorPlanSettings; onSave: (payload: unknown) => Promise<boolean> }) {
  const [url, setUrl] = useState(settings.url ?? '');
  const [opacity, setOpacity] = useState(Math.round(settings.opacity * 100));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onSave({ resource: 'background', backgroundUrl: url.trim() || null, backgroundOpacity: opacity / 100 });
  };
  const clear = () => { setUrl(''); void onSave({ resource: 'background', backgroundUrl: null, backgroundOpacity: opacity / 100 }); };

  return <form onSubmit={submit} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><div className="flex items-start gap-3"><span className="rounded-full bg-primary/10 p-2 text-primary"><ImagePlus aria-hidden="true" size={18} /></span><div><h2 className="font-display text-2xl text-foreground">Fundo da planta</h2><p className="mt-1 text-xs text-muted">Use a imagem da planta baixa para orientar a organização das mesas.</p></div></div><label className="mt-4 block"><span className="admin-label">URL ou caminho público da imagem</span><input value={url} onChange={(event) => setUrl(event.target.value)} className="admin-input" placeholder="/assets/floor-plans/salao.jpg" inputMode="url" /><span className="mt-1 block text-xs text-muted">Aceita um caminho do site ou uma URL HTTPS. A imagem fica atrás das mesas e não interfere na ocupação.</span></label><div className="mt-4 flex items-center gap-3"><label htmlFor="floor-plan-opacity" className="admin-label mb-0 whitespace-nowrap">Opacidade</label><input id="floor-plan-opacity" type="range" min="10" max="80" step="5" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="w-full accent-[var(--primary)]" /><output htmlFor="floor-plan-opacity" className="w-12 text-right text-xs font-semibold text-primary">{opacity}%</output></div>{url && <div className="mt-4 overflow-hidden rounded-[var(--radius-sm)] border border-border bg-[var(--surface-muted)]"><img src={url} alt="Prévia do fundo da planta" className="h-28 w-full object-cover" style={{ opacity: opacity / 100 }} /></div>}<div className="mt-5 flex flex-wrap gap-2"><button type="submit" className="admin-primary-button"><ImagePlus aria-hidden="true" size={16} /> Aplicar fundo</button>{settings.url && <button type="button" onClick={clear} className="admin-secondary-button">Remover fundo</button>}</div></form>;
}

function BlockedPeriodForm({ areas, tables, onCreate }: { areas: AdminArea[]; tables: AdminTable[]; onCreate: (payload: unknown) => Promise<boolean> }) {
  const [scope, setScope] = useState('all');
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); void onCreate({ resource: 'blocked_period', scope, areaId: scope === 'area' ? Number(form.get('areaId')) : null, tableId: scope === 'table' ? Number(form.get('tableId')) : null, startsAt: String(form.get('startsAt') ?? ''), endsAt: String(form.get('endsAt') ?? ''), reason: String(form.get('reason') ?? '') }); };
  return <form onSubmit={submit} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><h2 className="font-display text-2xl text-foreground">Novo bloqueio</h2><p className="mt-1 text-xs text-muted">Retire uma área ou mesa da disponibilidade pública.</p><div className="mt-4 space-y-3"><label className="block"><span className="admin-label">Escopo</span><select value={scope} onChange={(event) => setScope(event.target.value)} className="admin-input"><option value="all">Todo o salão</option><option value="area">Área</option><option value="table">Mesa</option></select></label>{scope === 'area' && <label className="block"><span className="admin-label">Área</span><select name="areaId" required className="admin-input">{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>}{scope === 'table' && <label className="block"><span className="admin-label">Mesa</span><select name="tableId" required className="admin-input">{tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></label>}<div className="grid grid-cols-2 gap-3"><label className="block"><span className="admin-label">Início</span><input name="startsAt" type="datetime-local" required className="admin-input" /></label><label className="block"><span className="admin-label">Fim</span><input name="endsAt" type="datetime-local" required className="admin-input" /></label></div><input name="reason" required className="admin-input" placeholder="Manutenção, evento privado..." /></div><button type="submit" className="admin-primary-button mt-5"><Ban aria-hidden="true" size={16} /> Criar bloqueio</button></form>;
}

function CombinationList({ combinations, onRemove }: { combinations: AdminCombination[]; onRemove: (combination: AdminCombination) => Promise<void> }) {
  return <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-2xl text-foreground">Combinações ativas</h2><p className="mt-1 text-xs text-muted">Desfaça uma combinação sem apagar o histórico das reservas.</p></div><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{combinations.length}</span></div>{combinations.length === 0 ? <p className="mt-4 text-sm text-muted">Nenhuma combinação cadastrada.</p> : <ul className="mt-4 divide-y divide-border">{combinations.map((combination) => <li key={combination.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-medium text-foreground">{combination.name}</p><p className="truncate text-xs text-muted">{combination.code} · {combination.tableLabel}</p></div><button type="button" onClick={() => void onRemove(combination)} className="admin-text-button shrink-0"><Undo2 aria-hidden="true" size={15} /> Desfazer</button></li>)}</ul>}</section>;
}

function BlockedPeriodList({ blockedPeriods }: { blockedPeriods: AdminBlockedPeriod[] }) {
  return <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><h2 className="font-display text-2xl text-foreground">Bloqueios do dia</h2>{blockedPeriods.length === 0 ? <p className="mt-4 text-sm text-muted">Nenhum bloqueio para esta data.</p> : <div className="mt-4 divide-y divide-border">{blockedPeriods.map((block) => <p key={block.id} className="py-3 text-sm"><span className="font-medium text-foreground">{block.areaName ?? block.tableName ?? 'Todo o salão'}</span><span className="block text-xs text-muted">{block.startsAt}–{block.endsAt} · {block.reason}</span></p>)}</div>}</section>;
}

export function AdminFloorMapView({ initialMap, areas }: { initialMap: AdminFloorMap; areas: AdminArea[] }) {
  const [map, setMap] = useState(initialMap);
  const [date, setDate] = useState(initialMap.date);
  const [time, setTime] = useState(initialMap.time);
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const selectionRef = useRef({ date: initialMap.date, time: initialMap.time });
  const loadRequestRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMap = async (nextDate: string, nextTime: string) => {
    const requestId = ++loadRequestRef.current;
    selectionRef.current = { date: nextDate, time: nextTime };
    setDate(nextDate); setTime(nextTime); setIsLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/floor-map?date=${encodeURIComponent(nextDate)}&time=${encodeURIComponent(nextTime)}`);
      if (requestId !== loadRequestRef.current) return;
      if (response.ok) setMap(await response.json() as AdminFloorMap); else setError('Não foi possível atualizar o mapa.');
    } catch {
      if (requestId === loadRequestRef.current) setError('Não foi possível atualizar o mapa.');
    } finally {
      if (requestId === loadRequestRef.current) setIsLoading(false);
    }
  };
  const savePosition = async (tableId: number, positionX: number, positionY: number) => {
    const response = await fetch(`/api/admin/floor-map/tables/${tableId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ positionX, positionY }) });
    if (response.ok) setMap((current) => ({ ...current, tables: current.tables.map((table) => table.id === tableId ? { ...table, positionX, positionY } : table) })); else setError('Não foi possível salvar a posição da mesa.');
  };
  const create = async (payload: unknown): Promise<boolean> => {
    setMessage(''); setError('');
    try {
      const response = await fetch('/api/admin/floor-map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) { setError(response.status === 409 ? 'Este código ou registro já existe.' : 'Não foi possível salvar.'); return false; }
      setMessage('Alteração salva.'); const selection = selectionRef.current; await loadMap(selection.date, selection.time); return true;
    } catch {
      setError('Não foi possível salvar.'); return false;
    }
  };
  const removeCombination = async (combination: AdminCombination) => {
    if (!window.confirm(`Desfazer a combinação “${combination.name}”? As reservas existentes serão preservadas.`)) return;
    setMessage(''); setError('');
    try {
      const response = await fetch(`/api/admin/floor-map/combinations/${combination.id}`, { method: 'DELETE' });
      if (!response.ok) { setError(response.status === 404 ? 'A combinação já foi desfeita.' : 'Não foi possível desfazer a combinação.'); return; }
      setMessage('Combinação desfeita.'); const selection = selectionRef.current; await loadMap(selection.date, selection.time);
    } catch {
      setError('Não foi possível desfazer a combinação.');
    }
  };
  const toggleCombinationTable = (id: number) => {
    const table = map.tables.find((item) => item.id === id);
    if (!table?.joinable) return;
    setSelectedTableIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Floor manager</p><h1 className="mt-2 font-display text-4xl text-foreground">Mapa do salão</h1><p className="mt-2 text-sm text-muted">Posicione as mesas e visualize a ocupação operacional.</p></div><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs font-semibold text-muted"><MapPin aria-hidden="true" size={16} className="text-primary" /><input aria-label="Data do mapa" type="date" value={date} onChange={(event) => loadMap(event.target.value, time)} className="admin-input w-auto" /></label><label className="flex items-center gap-2 text-xs font-semibold text-muted"><Clock3 aria-hidden="true" size={16} className="text-primary" /><input aria-label="Horário do mapa" type="time" value={time} onChange={(event) => loadMap(date, event.target.value)} className="admin-input w-auto" /></label></div></header>
    {isLoading && <p className="mt-5 flex items-center gap-2 text-sm text-muted"><LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Atualizando mapa...</p>}{message && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-status-success"><Check aria-hidden="true" size={16} /> {message}</p>}{error && <p role="alert" className="mt-5 text-sm text-status-danger">{error}</p>}
    <section className="mt-8 rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-sm sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-2xl text-foreground">Planta operacional</h2><p className="mt-1 text-xs text-muted">Arraste para posicionar · clique nas mesas para selecionar · use a roda do mouse para zoom.</p><p className="mt-1 text-xs text-muted">Estado das mesas em {date.split('-').reverse().join('/')} às {time}{selectedTableIds.length > 0 ? ` · ${selectedTableIds.length} selecionada(s)` : ''}.</p></div><StateLegend /></div><FloorMapCanvas tables={map.tables} combinations={map.combinations} background={map.background} selectedTableIds={selectedTableIds} onPositionChange={savePosition} onTableToggle={toggleCombinationTable} /></section>
    <div className="mt-8 grid gap-5 xl:grid-cols-2"><FloorPlanBackgroundForm key={`${map.background.url ?? 'none'}-${map.background.opacity}`} settings={map.background} onSave={create} /><CombinationForm tables={map.tables} selectedTableIds={selectedTableIds} onToggleTable={toggleCombinationTable} onClearSelection={() => setSelectedTableIds([])} onCreate={create} /><BlockedPeriodForm areas={areas} tables={map.tables} onCreate={create} /><CombinationList combinations={map.combinations} onRemove={removeCombination} /><BlockedPeriodList blockedPeriods={map.blockedPeriods} /></div>
    <p className="mt-8 flex items-center gap-2 text-xs text-muted"><Table2 aria-hidden="true" size={15} /> A seleção de mesas no público continua opcional; as combinações ativas alimentam a disponibilidade automaticamente.</p>
  </div>;
}
