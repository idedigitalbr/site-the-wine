'use client';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { FloorElement, FloorPlanBackground, FloorPlanDocument } from '@/modules/floor-plan/domain/model';
import type { FloorPlanState } from '@/modules/floor-plan/application/ports';
import { normalizeFloorPlanDocument } from '@/modules/floor-plan/domain/normalize-document';
import { getFloorPlanEditorSettings } from '@/modules/floor-plan/domain/editor-settings';
import { applyEditorConstraints } from '@/modules/floor-plan/domain/editor-constraints';
import { removeLinksForTable, toggleJoinLink } from '@/modules/floor-plan/domain/join-links';
import { backgroundBounds, expandDocumentAroundBackground } from '@/modules/floor-plan/domain/background-geometry';

function sameDocument(a: FloorPlanDocument, b: FloorPlanDocument) { return JSON.stringify(a) === JSON.stringify(b); }
function translateElement(element: FloorElement, delta: { x: number; y: number }): FloorElement { return { ...element, x: element.x + delta.x, y: element.y + delta.y }; }
export function useFloorPlanEditor(initialState: FloorPlanState) {
  const [state, setState] = useState(() => ({ ...initialState, draft: normalizeFloorPlanDocument(initialState.draft) })); const [document, setDocument] = useState(() => normalizeFloorPlanDocument(initialState.draft)); const [selectedId, setSelectedId] = useState<string | null>(null); const [transformId, setTransformId] = useState<string | null>(null); const [history, setHistory] = useState<FloorPlanDocument[]>([]); const [future, setFuture] = useState<FloorPlanDocument[]>([]); const gestureSnapshot = useRef<FloorPlanDocument | null>(null);
  const selected = useMemo(() => document.elements.find((element) => element.id === selectedId) ?? null, [document.elements, selectedId]);
  const dirty = !sameDocument(document, state.draft);
  const pushHistory = useCallback((previous: FloorPlanDocument) => { setHistory((items) => [...items.slice(-99), previous]); setFuture([]); }, []);
  const replaceDocument = useCallback((next: FloorPlanDocument, record = true) => { if (sameDocument(next, document)) return; if (record) pushHistory(document); setDocument(next); }, [document, pushHistory]);
  const updateElement = useCallback((id: string, patch: Partial<FloorElement>) => { setDocument((current) => ({ ...current, elements: current.elements.map((element) => element.id === id ? applyEditorConstraints({ ...element, ...patch } as FloorElement, current, { ...getFloorPlanEditorSettings(current), snapToGrid: false, snapPosition: false, snapSize: false }) : element) })); }, []);
  const updateSelected = useCallback((patch: Partial<FloorElement>) => { if (selected) { const nextElements = document.elements.map((element) => element.id === selected.id ? applyEditorConstraints({ ...element, ...patch } as FloorElement, document, { ...getFloorPlanEditorSettings(document), snapToGrid: false, snapPosition: false, snapSize: false }) : element); const changed = nextElements.find((element) => element.id === selected.id); const joinLinks = changed?.kind === 'table' && (!changed.allowJoin || !changed.reservable) ? removeLinksForTable(document.joinLinks, changed.id) : document.joinLinks; replaceDocument({ ...document, elements: nextElements, joinLinks }); } }, [document, replaceDocument, selected]);
  const toggleJoin = useCallback((first: string, second: string, enabled: boolean) => { const a = document.elements.find((element) => element.id === first); const b = document.elements.find((element) => element.id === second); if (a?.kind !== 'table' || b?.kind !== 'table' || !a.allowJoin || !b.allowJoin || !a.reservable || !b.reservable) return; replaceDocument({ ...document, joinLinks: toggleJoinLink(document, first, second, enabled) }); }, [document, replaceDocument]);
  const removeElement = useCallback((id: string) => { const removed = document.elements.find((element) => element.id === id); if (!removed) return; const elements = document.elements.filter((element) => element.id !== id); replaceDocument({ ...document, elements, joinLinks: removeLinksForTable(document.joinLinks, id) }); if (selectedId === id) { setSelectedId(null); setTransformId(null); } }, [document, replaceDocument, selectedId]);
  const updateBackground = useCallback((patch: Partial<FloorPlanBackground> | null, record = true): FloorPlanDocument => {
    if (patch === null) { const nextDocument = { ...document, background: null }; replaceDocument(nextDocument, record); return nextDocument; }
    const nextBackground = { ...(document.background ?? {}), ...patch } as FloorPlanBackground;
    const expansion = expandDocumentAroundBackground(document, nextBackground);
    const delta = document.background ? expansion.shift : expansion.shift;
    const elements = delta.x || delta.y ? document.elements.map((element) => translateElement(element, delta)) : document.elements;
    const background = { ...nextBackground, x: nextBackground.x + delta.x, y: nextBackground.y + delta.y };
    const nextDocument = { ...document, width: expansion.width, height: expansion.height, elements, background };
    replaceDocument(nextDocument, record);
    return nextDocument;
  }, [document, replaceDocument]);
  const beginGesture = useCallback((id: string) => { if (!gestureSnapshot.current) gestureSnapshot.current = document; setSelectedId(id); }, [document]);
  const beginBackgroundGesture = useCallback(() => { if (!gestureSnapshot.current) gestureSnapshot.current = document; }, [document]);
  const endGesture = useCallback(() => { const snapshot = gestureSnapshot.current; gestureSnapshot.current = null; if (snapshot && !sameDocument(snapshot, document)) pushHistory(snapshot); }, [document, pushHistory]);
  const syncSelection = useCallback((next: FloorPlanDocument) => { setSelectedId((current) => current && next.elements.some((element) => element.id === current) ? current : null); setTransformId((current) => current && next.elements.some((element) => element.id === current) ? current : null); }, []);
  const undo = useCallback(() => { const previous = history.at(-1); if (!previous) return; setHistory((items) => items.slice(0, -1)); setFuture((items) => [...items, document]); setDocument(previous); syncSelection(previous); }, [document, history, syncSelection]);
  const redo = useCallback(() => { const next = future.at(-1); if (!next) return; setFuture((items) => items.slice(0, -1)); setHistory((items) => [...items, document]); setDocument(next); syncSelection(next); }, [document, future, syncSelection]);
  const applyState = useCallback((next: FloorPlanState) => { const draft = normalizeFloorPlanDocument(next.draft); setState({ ...next, draft }); setDocument(draft); setHistory([]); setFuture([]); syncSelection(draft); }, [syncSelection]);
  return { state, setState, document, setDocument, selectedId, setSelectedId, transformId, setTransformId, selected, dirty, history, future, replaceDocument, updateElement, updateSelected, toggleJoin, removeElement, updateBackground, beginGesture, beginBackgroundGesture, endGesture, undo, redo, applyState };
}
