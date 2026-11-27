export type Point = { x: number; y: number };
export type TableElement = {
  id: string;
  kind: 'table';
  label: string;
  realTableId: number | null;
  areaId: number | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  shape: 'round' | 'square' | 'rectangle' | 'bar';
  capacityMin: number;
  capacityMax: number;
  reservable: boolean;
  allowJoin: boolean;
  keepAspectRatio: boolean;
};

export type FloorElement = TableElement;
export type JoinLink = { tableIds: [string, string] };
export type FloorPlanBackground = {
  assetId: string;
  name: string;
  naturalWidth: number;
  naturalHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  keepAspectRatio: boolean;
  allowTransform: boolean;
  allowDrag: boolean;
};

export type FloorPlanEditorSettings = {
  snapToGrid: boolean;
  showGrid: boolean;
  zoomOnScroll: boolean;
  zoomOnPinch: boolean;
  keepObjectsInBounds: boolean;
};

export type FloorPlanDocument = {
  schemaVersion: 1;
  width: number;
  height: number;
  grid: number;
  elements: FloorElement[];
  joinLinks: JoinLink[];
  background: FloorPlanBackground | null;
  editorSettings?: FloorPlanEditorSettings;
};

export type NeighborReason = 'compatible' | 'different_area' | 'overlap' | 'axis_mismatch' | 'frontal' | 'insufficient_alignment' | 'too_far' | 'not_reservable' | 'join_disabled';
export type TableNeighbor = { tableId: string; distance: number; compatible: boolean; reasons: NeighborReason[] };

export const DEFAULT_EDITOR_SETTINGS: FloorPlanEditorSettings = {
  snapToGrid: true,
  showGrid: true,
  zoomOnScroll: true,
  zoomOnPinch: true,
  keepObjectsInBounds: true,
};

export const DEFAULT_PLAN: FloorPlanDocument = { schemaVersion: 1, width: 1200, height: 900, grid: 20, elements: [], joinLinks: [], background: null, editorSettings: { ...DEFAULT_EDITOR_SETTINGS } };

export function createTableElement(input: Partial<TableElement> & Pick<TableElement, 'id' | 'label'>): TableElement {
  return {
    kind: 'table', realTableId: null, areaId: null, x: 120, y: 120, width: 200, height: 200,
    rotation: 0, shape: 'square', capacityMin: 1, capacityMax: 4, reservable: true, allowJoin: false, keepAspectRatio: true, ...input,
  };
}
