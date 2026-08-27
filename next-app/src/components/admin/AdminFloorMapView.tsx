'use client';

import { Background, Controls, Handle, MiniMap, Position, ReactFlow, useEdgesState, useNodesState, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Ban, Check, Clock3, Grip, LoaderCircle, MapPin, Plus, Table2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  AdminArea,
  AdminBlockedPeriod,
  AdminCombination,
  AdminFloorMap,
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

type TableNodeData = { table: FloorTable };
type TableNode = Node<TableNodeData, 'table'>;

function TableNodeCard({ data }: NodeProps<TableNode>) {
  const { table } = data;
  return <div role="button" tabIndex={0} aria-label={`${table.name} · ${stateLabels[table.state]}`} title={`${table.name} · ${stateLabels[table.state]}`} className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-[var(--radius-sm)] border-2 p-1.5 text-center shadow-sm transition hover:scale-105 sm:h-20 sm:w-24 sm:p-2 ${stateClasses[table.state]}`}><Handle type="target" position={Position.Top} className="!h-1 !w-1 !border-0 !bg-transparent" /><Grip aria-hidden="true" size={15} className="mb-1 opacity-50" /><span className="text-[11px] font-bold leading-tight sm:text-xs">{table.name}</span><span className="mt-1 text-[9px] leading-tight sm:text-[10px]">{table.capacityMin}–{table.capacityMax} lugares</span><Handle type="source" position={Position.Bottom} className="!h-1 !w-1 !border-0 !bg-transparent" /></div>;
}

const nodeTypes = { table: TableNodeCard };

function floorNodes(tables: FloorTable[]): TableNode[] {
  return tables.map((table, index) => {
    const position = displayPosition(table, index);
    return { id: String(table.id), type: 'table', position: { x: position.x * 10, y: position.y * 5 }, data: { table }, draggable: true };
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

function FloorMapCanvas({ tables, combinations, onPositionChange }: { tables: FloorTable[]; combinations: AdminCombination[]; onPositionChange: (id: number, x: number, y: number) => Promise<void> }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<TableNode>(floorNodes(tables));
  const [edges, , onEdgesChange] = useEdgesState(combinationEdges(combinations));

  useEffect(() => setNodes(floorNodes(tables)), [tables, setNodes]);

  const onNodeDragStop = async (_event: unknown, node: TableNode) => {
    const x = Math.min(96, Math.max(4, node.position.x / 10));
    const y = Math.min(92, Math.max(8, node.position.y / 5));
    await onPositionChange(Number(node.id), Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  };

  if (tables.length === 0) return <div className="flex min-h-[430px] items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border-strong text-sm text-muted">Cadastre mesas para iniciar o mapa.</div>;

  return <div className="h-[430px] overflow-hidden rounded-[var(--radius-md)] border border-dashed border-border-strong bg-[var(--surface-muted)] sm:h-[520px]"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeDragStop={onNodeDragStop} nodeOrigin={[0.5, 0.5]} fitView fitViewOptions={{ padding: 0.18 }} minZoom={0.5} maxZoom={2} nodesConnectable={false} proOptions={{ hideAttribution: true }}><Background color="rgba(169,132,69,.16)" gap={32} size={1} /><Controls showInteractive={false} /><MiniMap pannable zoomable nodeColor={(node) => { const table = (node.data as TableNodeData).table; return table.state === 'available' ? '#10b981' : table.state === 'reserved' ? '#f59e0b' : '#ef4444'; }} /></ReactFlow></div>;
}

function StateLegend() {
  return <div className="flex flex-wrap gap-4 text-xs text-muted">{Object.entries(stateLabels).map(([state, label]) => <span key={state} className="flex items-center gap-2"><i className={`h-3 w-3 rounded-full ${state === 'available' ? 'bg-emerald-500' : state === 'reserved' ? 'bg-amber-500' : 'bg-red-500'}`} /> {label}</span>)}</div>;
}

function CombinationForm({ tables, onCreate }: { tables: AdminTable[]; onCreate: (payload: unknown) => Promise<void> }) {
  const [selected, setSelected] = useState<number[]>([]);
  const toggle = (id: number) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); void onCreate({ resource: 'combination', code: String(form.get('code') ?? ''), name: String(form.get('name') ?? ''), tableIds: selected }); };
  return <form onSubmit={submit} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><h2 className="font-display text-2xl text-foreground">Nova combinação</h2><p className="mt-1 text-xs text-muted">Agrupe mesas que podem receber um mesmo grupo.</p><div className="mt-4 space-y-3"><input name="code" required className="admin-input" placeholder="m01-m02" /><input name="name" required className="admin-input" placeholder="Mesas 01 e 02" /><div><p className="admin-label">Mesas participantes</p><div className="grid max-h-36 gap-2 overflow-y-auto sm:grid-cols-2">{tables.filter((table) => table.joinable).map((table) => <label key={table.id} className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={selected.includes(table.id)} onChange={() => toggle(table.id)} className="reservation-checkbox" /> {table.name}</label>)}</div></div></div><button type="submit" disabled={selected.length < 2} className="admin-primary-button mt-5 disabled:cursor-not-allowed disabled:opacity-50"><Plus aria-hidden="true" size={16} /> Adicionar combinação</button></form>;
}

function BlockedPeriodForm({ areas, tables, onCreate }: { areas: AdminArea[]; tables: AdminTable[]; onCreate: (payload: unknown) => Promise<void> }) {
  const [scope, setScope] = useState('all');
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); void onCreate({ resource: 'blocked_period', scope, areaId: scope === 'area' ? Number(form.get('areaId')) : null, tableId: scope === 'table' ? Number(form.get('tableId')) : null, startsAt: String(form.get('startsAt') ?? ''), endsAt: String(form.get('endsAt') ?? ''), reason: String(form.get('reason') ?? '') }); };
  return <form onSubmit={submit} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><h2 className="font-display text-2xl text-foreground">Novo bloqueio</h2><p className="mt-1 text-xs text-muted">Retire uma área ou mesa da disponibilidade pública.</p><div className="mt-4 space-y-3"><label className="block"><span className="admin-label">Escopo</span><select value={scope} onChange={(event) => setScope(event.target.value)} className="admin-input"><option value="all">Todo o salão</option><option value="area">Área</option><option value="table">Mesa</option></select></label>{scope === 'area' && <label className="block"><span className="admin-label">Área</span><select name="areaId" required className="admin-input">{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>}{scope === 'table' && <label className="block"><span className="admin-label">Mesa</span><select name="tableId" required className="admin-input">{tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></label>}<div className="grid grid-cols-2 gap-3"><label className="block"><span className="admin-label">Início</span><input name="startsAt" type="datetime-local" required className="admin-input" /></label><label className="block"><span className="admin-label">Fim</span><input name="endsAt" type="datetime-local" required className="admin-input" /></label></div><input name="reason" required className="admin-input" placeholder="Manutenção, evento privado..." /></div><button type="submit" className="admin-primary-button mt-5"><Ban aria-hidden="true" size={16} /> Criar bloqueio</button></form>;
}

function CombinationList({ combinations }: { combinations: AdminCombination[] }) {
  return <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><h2 className="font-display text-2xl text-foreground">Combinações ativas</h2>{combinations.length === 0 ? <p className="mt-4 text-sm text-muted">Nenhuma combinação cadastrada.</p> : <div className="mt-4 divide-y divide-border">{combinations.map((combination) => <p key={combination.id} className="flex justify-between gap-3 py-3 text-sm"><span className="font-medium text-foreground">{combination.name}</span><span className="text-right text-xs text-muted">{combination.tableLabel}</span></p>)}</div>}</section>;
}

function BlockedPeriodList({ blockedPeriods }: { blockedPeriods: AdminBlockedPeriod[] }) {
  return <section className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-sm"><h2 className="font-display text-2xl text-foreground">Bloqueios do dia</h2>{blockedPeriods.length === 0 ? <p className="mt-4 text-sm text-muted">Nenhum bloqueio para esta data.</p> : <div className="mt-4 divide-y divide-border">{blockedPeriods.map((block) => <p key={block.id} className="py-3 text-sm"><span className="font-medium text-foreground">{block.areaName ?? block.tableName ?? 'Todo o salão'}</span><span className="block text-xs text-muted">{block.startsAt}–{block.endsAt} · {block.reason}</span></p>)}</div>}</section>;
}

export function AdminFloorMapView({ initialMap, areas }: { initialMap: AdminFloorMap; areas: AdminArea[] }) {
  const [map, setMap] = useState(initialMap);
  const [date, setDate] = useState(initialMap.date);
  const [time, setTime] = useState(initialMap.time);
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
  const create = async (payload: unknown) => {
    setMessage(''); setError('');
    const response = await fetch('/api/admin/floor-map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) { setError(response.status === 409 ? 'Este código ou registro já existe.' : 'Não foi possível salvar.'); return; }
    setMessage('Alteração salva.'); const selection = selectionRef.current; await loadMap(selection.date, selection.time);
  };

  return <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10"><header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Floor manager</p><h1 className="mt-2 font-display text-4xl text-foreground">Mapa do salão</h1><p className="mt-2 text-sm text-muted">Posicione as mesas e visualize a ocupação operacional.</p></div><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs font-semibold text-muted"><MapPin aria-hidden="true" size={16} className="text-primary" /><input type="date" value={date} onChange={(event) => loadMap(event.target.value, time)} className="admin-input w-auto" /></label><label className="flex items-center gap-2 text-xs font-semibold text-muted"><Clock3 aria-hidden="true" size={16} className="text-primary" /><input type="time" value={time} onChange={(event) => loadMap(date, event.target.value)} className="admin-input w-auto" /></label></div></header>
    {isLoading && <p className="mt-5 flex items-center gap-2 text-sm text-muted"><LoaderCircle aria-hidden="true" className="animate-spin" size={16} /> Atualizando mapa...</p>}{message && <p role="status" className="mt-5 flex items-center gap-2 text-sm text-status-success"><Check aria-hidden="true" size={16} /> {message}</p>}{error && <p role="alert" className="mt-5 text-sm text-status-danger">{error}</p>}
    <section className="mt-8 rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-sm sm:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-2xl text-foreground">Planta operacional</h2><p className="mt-1 text-xs text-muted">Arraste para posicionar · use a roda do mouse para zoom · linhas tracejadas representam combinações.</p><p className="mt-1 text-xs text-muted">Estado das mesas em {date.split('-').reverse().join('/')} às {time}.</p></div><StateLegend /></div><FloorMapCanvas tables={map.tables} combinations={map.combinations} onPositionChange={savePosition} /></section>
    <div className="mt-8 grid gap-5 xl:grid-cols-2"><CombinationForm tables={map.tables} onCreate={create} /><BlockedPeriodForm areas={areas} tables={map.tables} onCreate={create} /><CombinationList combinations={map.combinations} /><BlockedPeriodList blockedPeriods={map.blockedPeriods} /></div>
    <p className="mt-8 flex items-center gap-2 text-xs text-muted"><Table2 aria-hidden="true" size={15} /> A seleção de mesas no público continua opcional; holds e proteção transacional entram na próxima fase.</p>
  </div>;
}
