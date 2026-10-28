'use client';

import type { FloorPlanEditorSettings } from '@/modules/floor-plan/domain/model';

type Props = { settings: FloorPlanEditorSettings; grid?: number; disabled?: boolean; onChange: (patch: Partial<FloorPlanEditorSettings>) => void };
const OPTIONS: Array<{ key: keyof FloorPlanEditorSettings; label: string; description: string }> = [
  { key: 'snapToGrid', label: 'Encaixar ao mover', description: 'Alinha o objeto à grade somente enquanto ele é arrastado.' },
  { key: 'showGrid', label: 'Mostrar grade', description: 'Exibe linhas quadradas de referência por toda a planta.' },
  { key: 'zoomOnScroll', label: 'Zoom com a roda do mouse', description: 'Usa a roda do mouse para aproximar e afastar a planta.' },
  { key: 'zoomOnPinch', label: 'Zoom com pinça no trackpad', description: 'Permite zoom com o gesto de pinça do trackpad.' },
  { key: 'keepObjectsInBounds', label: 'Manter objetos dentro da planta', description: 'Impede que objetos ultrapassem os limites do mapa.' },
];

export function FloorPlanSettings({ settings, grid = 20, disabled = false, onChange }: Props) {
  return <section className="floor-plan-settings" aria-labelledby="floor-plan-settings-title"><div className="floor-plan-settings-heading"><div><h3 id="floor-plan-settings-title" className="font-display text-xl text-foreground">Configurações da planta</h3><p className="text-xs text-muted">As opções são salvas com o rascunho do mapa.</p></div></div><div className="floor-plan-settings-grid">{OPTIONS.map((option) => <label key={option.key} className={`floor-plan-toggle${disabled ? ' is-disabled' : ''}`}><span><strong>{option.label}</strong><small>{option.key === 'snapToGrid' ? `Encaixa o arraste a cada ${(grid / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m. Não altera tamanho nem rotação.` : option.description}</small></span><input type="checkbox" checked={settings[option.key]} disabled={disabled} onChange={(event) => onChange({ [option.key]: event.target.checked })} /></label>)}</div></section>;
}
