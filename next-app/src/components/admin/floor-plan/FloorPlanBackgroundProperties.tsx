'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FloorPlanBackground } from '@/modules/floor-plan/domain/model';

type Props = {
  background: FloorPlanBackground;
  disabled?: boolean;
  editing?: boolean;
  onChange: (patch: Partial<FloorPlanBackground>) => void;
  onRemove: () => void;
  onToggleEditing: () => void;
};

function meters(value: number) { return (value / 100).toFixed(2).replace('.', ','); }
function parseMeters(value: string) { const parsed = Number(value.replace(',', '.')); return Number.isFinite(parsed) && parsed > 0 ? parsed * 100 : null; }

function MeterField({ label, value, disabled, onCommit }: { label: string; value: number; disabled: boolean; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(() => meters(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setDraft(meters(value)); setInvalid(false); }, [value]);
  const commit = () => { const parsed = parseMeters(draft); if (!parsed) { setInvalid(true); return; } setInvalid(false); setDraft(meters(parsed)); onCommit(parsed); };
  return <label className="floor-plan-field"><span>{label}</span><input value={draft} type="text" inputMode="decimal" disabled={disabled} aria-disabled={disabled} aria-invalid={invalid} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } if (event.key === 'Escape') { setDraft(meters(value)); setInvalid(false); event.currentTarget.blur(); } }} onBlur={commit} />{invalid && <small className="text-status-danger">Informe uma medida maior que zero.</small>}</label>;
}

function Toggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className="floor-plan-toggle"><span><strong>{label}</strong></span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /></label>;
}

export function FloorPlanBackgroundProperties({ background, disabled = false, editing = false, onChange, onRemove, onToggleEditing }: Props) {
  const transformDisabled = disabled || !background.allowTransform;
  const commitWidth = (value: number) => onChange(background.keepAspectRatio ? { width: value, height: value * (background.naturalHeight / background.naturalWidth) } : { width: value });
  const commitHeight = (value: number) => onChange(background.keepAspectRatio ? { height: value, width: value * (background.naturalWidth / background.naturalHeight) } : { height: value });
  return <aside className="floor-plan-properties"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Propriedades</p><h2 className="mt-1 font-display text-2xl text-foreground">Imagem de fundo</h2></div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase text-primary">Imagem</span></div><p className="mt-2 text-xs text-muted">A imagem fica atrás das mesas e serve como referência visual do salão.</p><div className="mt-5 grid grid-cols-2 gap-2"><MeterField label="Largura (m)" value={background.width} disabled={transformDisabled} onCommit={commitWidth} /><MeterField label="Altura (m)" value={background.height} disabled={transformDisabled} onCommit={commitHeight} /></div><label className="floor-plan-field mt-3"><span>Rotação (graus)</span><input value={Math.round(background.rotation)} type="number" disabled={transformDisabled} onChange={(event) => onChange({ rotation: Number(event.target.value) })} /></label><Toggle label="Manter proporção" checked={background.keepAspectRatio} disabled={disabled} onChange={(checked) => onChange({ keepAspectRatio: checked })} /><div className="mt-4"><Toggle label="Permitir alterar tamanho e giro no mapa" checked={background.allowTransform} disabled={disabled} onChange={(checked) => onChange({ allowTransform: checked })} /><Toggle label="Permitir arrastar imagem no mapa" checked={background.allowDrag} disabled={disabled} onChange={(checked) => onChange({ allowDrag: checked })} /></div><button type="button" className={`admin-secondary-button mt-5 w-full justify-center ${editing ? 'ring-2 ring-primary/30' : ''}`} disabled={disabled || !background.allowTransform} onClick={onToggleEditing}><Pencil size={15} /> {editing ? 'Concluir edição no mapa' : 'Editar tamanho e giro no mapa'}</button><button type="button" className="admin-secondary-button mt-2 w-full justify-center text-status-danger" disabled={disabled} onClick={onRemove}><Trash2 size={15} /> Remover imagem</button></aside>;
}
