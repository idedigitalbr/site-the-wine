'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { ReactFlow, ReactFlowProvider, ViewportPortal, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { FloorElement, FloorPlanBackground, FloorPlanDocument, TableElement } from '@/modules/floor-plan/domain/model';
import { resizeBox, rotateAroundCenter, snap, snapRotationToAxes, type ResizeHandle } from '@/modules/floor-plan/domain/element-transforms';
import { applyEditorConstraints } from '@/modules/floor-plan/domain/editor-constraints';
import { getFloorPlanEditorSettings } from '@/modules/floor-plan/domain/editor-settings';
import { FloorPlanScene } from '@/components/floor-plan/FloorPlanScene';
import { resizeBackground, translateBackground } from '@/modules/floor-plan/domain/background-geometry';
import { clampPanAxis, MAX_FLOOR_PLAN_ZOOM, sceneBoundsToViewport, viewportForSceneBounds } from '@/modules/floor-plan/domain/viewport';
import { workspaceBounds } from '@/modules/floor-plan/domain/workspace-geometry';

type BackgroundHandle = 'move' | 'rotate' | 'nw' | 'ne' | 'se' | 'sw' | 'e' | 'w' | 'n' | 's';
type Props = { document: FloorPlanDocument; selectedId: string | null; transformId: string | null; backgroundEditing?: boolean; backgroundSelected?: boolean; fitRequest?: number; readOnly?: boolean; onSelect: (id: string | null) => void; onBackgroundSelect?: () => void; onPencil?: (id: string) => void; onBackgroundPencil?: () => void; onChange: (id: string, patch: Partial<FloorElement>) => void; onBackgroundChange?: (patch: Partial<FloorPlanBackground>, record?: boolean) => void; onGestureStart: (id: string) => void; onBackgroundGestureStart?: () => void; onGestureEnd: () => void };
type Gesture = { id: string; kind: 'move' | 'resize' | 'rotate'; handle?: ResizeHandle; startX: number; startY: number; startAngle?: number; startRotation?: number; origin: FloorElement; started: boolean };
type PanGesture = { startX: number; startY: number; viewport: { x: number; y: number; zoom: number } };
type BackgroundGesture = { kind: BackgroundHandle; startX: number; startY: number; startAngle?: number; startRotation?: number; origin: FloorPlanBackground };
function elementCenter(element: FloorElement) { return { x: element.x, y: element.y }; }
function contentBounds(document: FloorPlanDocument) { return workspaceBounds(document); }
function clampViewportToBounds(viewport: { x: number; y: number; zoom: number }, bounds: { x: number; y: number; width: number; height: number }, sceneWidth: number, sceneHeight: number, viewportWidth: number, viewportHeight: number, padding = 24) {
  const screenBounds = sceneBoundsToViewport(bounds, sceneWidth, sceneHeight, viewportWidth, viewportHeight);
  const zoom = Math.max(0.0001, viewport.zoom);
  const scaledWidth = screenBounds.width * zoom;
  const scaledHeight = screenBounds.height * zoom;
  const x = clampPanAxis(viewport.x, screenBounds.x * zoom, scaledWidth, viewportWidth, padding);
  const y = clampPanAxis(viewport.y, screenBounds.y * zoom, scaledHeight, viewportHeight, padding);
  return { x, y, zoom };
}
function gestureDelta(active: Gesture, origin: FloorElement, point: { x: number; y: number }) { if (active.kind !== 'move') return { x: point.x - active.startX, y: point.y - active.startY }; const center = elementCenter(origin); return { x: point.x - active.startX - center.x, y: point.y - active.startY - center.y }; }
function nextBackground(backgroundGesture: BackgroundGesture, point: { x: number; y: number }, document: FloorPlanDocument, snapToGrid: boolean) {
  if (backgroundGesture.kind === 'rotate') {
    const center = backgroundGesture.origin;
    const angle = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
    const rotation = snapRotationToAxes((backgroundGesture.startRotation ?? center.rotation) + angle - (backgroundGesture.startAngle ?? angle));
    return { ...backgroundGesture.origin, rotation };
  }
  const delta = { x: point.x - backgroundGesture.startX, y: point.y - backgroundGesture.startY };
  let next = backgroundGesture.kind === 'move' ? translateBackground(backgroundGesture.origin, delta) : resizeBackground(backgroundGesture.origin, backgroundGesture.kind, delta);
  if (backgroundGesture.kind === 'move' && snapToGrid) next = { ...next, x: snap(next.x, document.grid), y: snap(next.y, document.grid) };
  return next;
}
function applyResize(active: Gesture, origin: TableElement, delta: { x: number; y: number }, document: FloorPlanDocument, onChange: (id: string, patch: Partial<FloorElement>) => void) { if (!active.handle) return; const settings = getFloorPlanEditorSettings(document); const transformSettings = { ...settings, snapToGrid: false, snapPosition: false, snapSize: false }; onChange(active.id, applyEditorConstraints({ ...origin, ...resizeBox(origin, active.handle, delta) }, document, transformSettings)); }
function applyPosition(active: Gesture, origin: TableElement, delta: { x: number; y: number }, document: FloorPlanDocument, onChange: (id: string, patch: Partial<FloorElement>) => void) { const settings = getFloorPlanEditorSettings(document); const next: FloorElement = { ...origin, x: origin.x + delta.x, y: origin.y + delta.y }; onChange(active.id, applyEditorConstraints(next, document, { ...settings, snapSize: false })); }
function applyGesture(active: Gesture, origin: TableElement, point: { x: number; y: number }, document: FloorPlanDocument, onChange: (id: string, patch: Partial<FloorElement>) => void) { const delta = gestureDelta(active, origin, point); if (active.kind === 'rotate') { onChange(active.id, applyEditorConstraints({ ...origin, ...rotateAroundCenter(origin, point, active.startAngle, active.startRotation) }, document, { ...getFloorPlanEditorSettings(document), snapToGrid: false, snapPosition: false, snapSize: false })); return; } if (active.kind === 'resize') { applyResize(active, origin, delta, document, onChange); return; } applyPosition(active, origin, delta, document, onChange); }
function FloorPlanCanvasInner({ document, selectedId, transformId, backgroundEditing = false, backgroundSelected = false, fitRequest = 0, readOnly = false, onSelect, onBackgroundSelect, onPencil, onBackgroundPencil, onChange, onBackgroundChange, onGestureStart, onBackgroundGestureStart, onGestureEnd }: Props) {
  const flow = useReactFlow(); const shellRef = useRef<HTMLDivElement>(null); const gesture = useRef<Gesture | null>(null); const backgroundGesture = useRef<BackgroundGesture | null>(null); const pan = useRef<PanGesture | null>(null);
  const [minimumZoom, setMinimumZoom] = useState(.02);
  const settings = getFloorPlanEditorSettings(document);
  const toWorld = useCallback((event: PointerEvent | React.PointerEvent) => { const svg = shellRef.current?.querySelector('svg.floor-plan-scene-svg') as SVGSVGElement | null; const matrix = svg?.getScreenCTM(); if (svg && matrix) { const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()); return { x: point.x, y: point.y }; } return flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }); }, [flow]);
  const beginMove = (event: React.PointerEvent<SVGElement>, id: string) => { event.stopPropagation(); const element = document.elements.find((candidate): candidate is TableElement => candidate.id === id); if (!element) return; const point = toWorld(event); const center = elementCenter(element); gesture.current = { id, kind: 'move', startX: point.x - center.x, startY: point.y - center.y, origin: element, started: false }; onSelect(id); };
  const beginPan = (event: React.PointerEvent<SVGElement>) => { event.stopPropagation(); event.preventDefault(); pan.current = { startX: event.clientX, startY: event.clientY, viewport: flow.getViewport() }; };
  const beginTransform = (event: React.PointerEvent<SVGElement>, id: string, handle: ResizeHandle | 'rotate') => { event.stopPropagation(); event.preventDefault(); const element = document.elements.find((candidate): candidate is TableElement => candidate.id === id); if (!element) return; const point = toWorld(event); const center = elementCenter(element); const startAngle = Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI; gesture.current = { id, kind: handle === 'rotate' ? 'rotate' : 'resize', handle: handle === 'rotate' ? undefined : handle, startX: point.x, startY: point.y, startAngle: handle === 'rotate' ? startAngle : undefined, startRotation: handle === 'rotate' ? element.rotation : undefined, origin: element, started: false }; onGestureStart(id); };
  const beginBackgroundTransform = (event: React.PointerEvent<SVGElement>, handle: BackgroundHandle) => {
    const background = document.background;
    if (!background || !onBackgroundChange || (handle === 'move' ? !background.allowDrag : !background.allowTransform)) return;
    event.stopPropagation(); event.preventDefault(); const point = toWorld(event);
    const startAngle = handle === 'rotate' ? Math.atan2(point.y - background.y, point.x - background.x) * 180 / Math.PI : undefined;
    backgroundGesture.current = { kind: handle, startX: point.x, startY: point.y, startAngle, startRotation: background.rotation, origin: background }; onBackgroundGestureStart?.();
  };
  const constrainViewport = useCallback((viewport: { x: number; y: number; zoom: number }) => { const rect = shellRef.current?.getBoundingClientRect(); if (!rect) return viewport; return clampViewportToBounds(viewport, contentBounds(document), document.width, document.height, rect.width, rect.height); }, [document]);
  useEffect(() => { const move = (event: PointerEvent) => { const activePan = pan.current; if (activePan) { flow.setViewport(constrainViewport({ x: activePan.viewport.x + event.clientX - activePan.startX, y: activePan.viewport.y + event.clientY - activePan.startY, zoom: activePan.viewport.zoom }), { duration: 0 }); return; } const activeBackground = backgroundGesture.current; if (activeBackground && onBackgroundChange) { onBackgroundChange(nextBackground(activeBackground, toWorld(event), document, settings.snapToGrid), false); return; } const active = gesture.current; if (!active) return; const origin = active.origin; const point = toWorld(event); if (!active.started) { active.started = true; onGestureStart(active.id); } applyGesture(active, origin, point, document, onChange); }; const finish = () => { pan.current = null; if (gesture.current) { gesture.current = null; onGestureEnd(); } if (backgroundGesture.current) { backgroundGesture.current = null; onGestureEnd(); } }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish); window.addEventListener('pointercancel', finish); window.addEventListener('blur', finish); return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); window.removeEventListener('blur', finish); }; }, [constrainViewport, document, flow, onBackgroundChange, onGestureEnd, onGestureStart, onChange, settings.snapToGrid, toWorld]);
  const fitContent = useCallback((duration: number) => { const rect = shellRef.current?.getBoundingClientRect(); if (!rect) return; const fitted = viewportForSceneBounds(contentBounds(document), document.width, document.height, rect.width, rect.height, 24); const nextMinimumZoom = Math.max(.02, Math.min(fitted.zoom * .65, fitted.zoom)); setMinimumZoom(nextMinimumZoom); flow.setViewport(constrainViewport({ ...fitted, zoom: Math.max(fitted.zoom, nextMinimumZoom) }), { duration }); }, [constrainViewport, document, flow]);
  const onMoveEnd = useCallback(() => { const viewport = flow.getViewport(); const constrained = constrainViewport(viewport); if (Math.abs(constrained.x - viewport.x) > .01 || Math.abs(constrained.y - viewport.y) > .01) flow.setViewport(constrained, { duration: 0 }); }, [constrainViewport, flow]);
  const init = useCallback(() => { window.requestAnimationFrame(() => fitContent(0)); }, [fitContent]);
  useEffect(() => { if (!fitRequest) return; window.requestAnimationFrame(() => fitContent(180)); }, [fitRequest, fitContent]);
  return <div ref={shellRef} className="floor-plan-canvas-shell"><ReactFlow nodes={[]} edges={[]} onInit={init} onMoveEnd={onMoveEnd} fitView={false} panOnScroll={false} panOnDrag={false} selectionOnDrag={false} zoomOnDoubleClick={false} zoomOnScroll={settings.zoomOnScroll} zoomOnPinch={settings.zoomOnPinch} zoomActivationKeyCode={null} panActivationKeyCode={null} minZoom={minimumZoom} maxZoom={MAX_FLOOR_PLAN_ZOOM} proOptions={{ hideAttribution: true }}><ViewportPortal><FloorPlanScene document={document} selectedId={selectedId} transformId={transformId} backgroundEditing={backgroundEditing} backgroundSelected={backgroundSelected} readOnly={readOnly} onSelect={onSelect} onBackgroundSelect={onBackgroundSelect} onPencil={onPencil} onBackgroundPencil={onBackgroundPencil} onPointerDown={readOnly ? undefined : beginMove} onBackgroundPointerDown={beginPan} onBackgroundTransformPointerDown={readOnly ? undefined : beginBackgroundTransform} onTransformPointerDown={readOnly ? undefined : beginTransform} /></ViewportPortal></ReactFlow><div className="floor-plan-zoom-controls" aria-label="Controles de zoom"><button type="button" aria-label="Aumentar zoom" onClick={() => flow.zoomIn({ duration: 120 })}><Plus size={16} /></button><button type="button" aria-label="Diminuir zoom" onClick={() => flow.zoomOut({ duration: 120 })}><Minus size={16} /></button><button type="button" aria-label="Enquadrar mapa" onClick={() => fitContent(180)}><Maximize2 size={15} /></button></div></div>;
}
export function FloorPlanCanvas(props: Props) { return <ReactFlowProvider><FloorPlanCanvasInner {...props} /></ReactFlowProvider>; }
