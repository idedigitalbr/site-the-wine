import { DEFAULT_EDITOR_SETTINGS, type FloorPlanDocument, type FloorPlanEditorSettings } from './model';

function booleanOrDefault(value: unknown, fallback: boolean) { return typeof value === 'boolean' ? value : fallback; }
export function getFloorPlanEditorSettings(document: Pick<FloorPlanDocument, 'editorSettings'>): FloorPlanEditorSettings {
  const raw = document.editorSettings;
  return {
    snapToGrid: booleanOrDefault(raw?.snapToGrid, DEFAULT_EDITOR_SETTINGS.snapToGrid),
    showGrid: booleanOrDefault(raw?.showGrid, DEFAULT_EDITOR_SETTINGS.showGrid),
    zoomOnScroll: booleanOrDefault(raw?.zoomOnScroll, DEFAULT_EDITOR_SETTINGS.zoomOnScroll),
    zoomOnPinch: booleanOrDefault(raw?.zoomOnPinch, DEFAULT_EDITOR_SETTINGS.zoomOnPinch),
    keepObjectsInBounds: booleanOrDefault(raw?.keepObjectsInBounds, DEFAULT_EDITOR_SETTINGS.keepObjectsInBounds),
  };
}
