import { DEFAULT_PLAN, type FloorElement, type FloorPlanBackground, type FloorPlanDocument, type TableElement } from './model';
import { getFloorPlanEditorSettings } from './editor-settings';
import { normalizeJoinLinks } from './join-links';

function numberOf(value: unknown, fallback: number): number { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function stringOf(value: unknown, fallback: string): string { return typeof value === 'string' && value.trim() ? value : fallback; }

function normalizeTable(raw: Record<string, unknown>, index: number): TableElement {
  const width = Math.max(1, numberOf(raw.width, 80)); const height = Math.max(1, numberOf(raw.height, width));
  return { id: stringOf(raw.id, `table-${index + 1}`), kind: 'table', label: stringOf(raw.label, `Mesa ${index + 1}`), realTableId: typeof raw.realTableId === 'number' ? raw.realTableId : null, areaId: typeof raw.areaId === 'number' ? raw.areaId : null, x: numberOf(raw.x, 120), y: numberOf(raw.y, 120), width, height: raw.keepAspectRatio === undefined && raw.shape === 'round' ? width : height, rotation: numberOf(raw.rotation, 0), shape: raw.shape === 'round' || raw.shape === 'rectangle' || raw.shape === 'bar' ? raw.shape : 'square', capacityMin: Math.max(1, Math.round(numberOf(raw.capacityMin, 1))), capacityMax: Math.max(1, Math.round(numberOf(raw.capacityMax, 4))), reservable: raw.reservable !== false, allowJoin: raw.allowJoin === true, keepAspectRatio: raw.keepAspectRatio !== false };
}

function validBackgroundValues(assetId: string, naturalWidth: number, naturalHeight: number, width: number, height: number) { return /^\d+$/.test(assetId) && Number(assetId) >= 1 && naturalWidth >= 1 && naturalHeight >= 1 && width >= 1 && height >= 1; }
function normalizeBackground(raw: unknown): FloorPlanBackground | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>; const assetId = stringOf(value.assetId, ''); const naturalWidth = Math.round(numberOf(value.naturalWidth, 0)); const naturalHeight = Math.round(numberOf(value.naturalHeight, 0)); const width = numberOf(value.width, 0); const height = numberOf(value.height, 0);
  if (!validBackgroundValues(assetId, naturalWidth, naturalHeight, width, height)) return null;
  return { assetId, name: stringOf(value.name, 'Planta do restaurante'), naturalWidth, naturalHeight, x: numberOf(value.x, 5000), y: numberOf(value.y, 5000), width, height, rotation: numberOf(value.rotation, 0), keepAspectRatio: value.keepAspectRatio !== false, allowTransform: value.allowTransform === true, allowDrag: value.allowDrag === true };
}

function normalizeElement(raw: unknown, index: number): FloorElement | null {
  if (!raw || typeof raw !== 'object' || (raw as Record<string, unknown>).kind !== 'table') return null;
  return normalizeTable(raw as Record<string, unknown>, index);
}

export function normalizeFloorPlanDocument(raw: unknown): FloorPlanDocument {
  if (!raw || typeof raw !== 'object') return DEFAULT_PLAN;
  const value = raw as Record<string, unknown>;
  const elements = Array.isArray(value.elements) ? value.elements.map(normalizeElement).filter((element): element is FloorElement => element !== null) : [];
  const normalized = { schemaVersion: 1 as const, width: Math.max(100, numberOf(value.width, DEFAULT_PLAN.width)), height: Math.max(100, numberOf(value.height, DEFAULT_PLAN.height)), grid: Math.max(1, numberOf(value.grid, DEFAULT_PLAN.grid)), elements };
  return { ...normalized, joinLinks: normalizeJoinLinks(value.joinLinks, normalized), background: normalizeBackground(value.background), editorSettings: getFloorPlanEditorSettings({ editorSettings: value.editorSettings as FloorPlanDocument['editorSettings'] }) };
}
