import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

test('map editor persists the five general settings and renders the settings panel', () => {
  const model = source('src/modules/floor-plan/domain/model.ts');
  const normalize = source('src/modules/floor-plan/domain/normalize-document.ts');
  const schema = source('src/modules/floor-plan/schemas/floor-plan-schema.ts');
  const settings = source('src/components/admin/floor-plan/FloorPlanSettings.tsx');
  const view = source('src/components/admin/FloorPlanEditorView.tsx');

  for (const key of ['snapToGrid', 'showGrid', 'zoomOnScroll', 'zoomOnPinch', 'keepObjectsInBounds']) {
    assert.match(model, new RegExp(key));
    assert.match(schema, new RegExp(key));
    assert.match(settings, new RegExp(key));
  }
  assert.doesNotMatch(model, /snapDoorsToWalls/);
  assert.doesNotMatch(schema, /snapDoorsToWalls/);
  assert.match(normalize, /getFloorPlanEditorSettings/);
  assert.match(view, /FloorPlanSettings/);
});

test('map canvas uses native grid, configurable zoom and constrained gestures', () => {
  const canvas = source('src/components/admin/floor-plan/FloorPlanCanvas.tsx');
  const scene = source('src/components/floor-plan/FloorPlanScene.tsx');
  const editor = source('src/components/admin/FloorPlanEditorView.tsx');
  const constraints = source('src/modules/floor-plan/domain/editor-constraints.ts');
  assert.match(canvas, /zoomOnScroll={settings\.zoomOnScroll}/);
  assert.match(canvas, /zoomOnPinch={settings\.zoomOnPinch}/);
  assert.match(canvas, /minZoom=\{minimumZoom\}/);
  assert.match(canvas, /setMinimumZoom/);
  assert.doesNotMatch(canvas, /FloorPlanGridBleed|floor-plan-grid-bleed/);
  assert.match(canvas, /applyEditorConstraints/);
  assert.match(canvas, /function contentBounds/);
  assert.match(canvas, /clampViewportToBounds/);
  assert.match(canvas, /onMoveEnd=\{onMoveEnd\}/);
  assert.match(canvas, /viewportForSceneBounds/);
  assert.match(canvas, /getScreenCTM/);
  assert.match(canvas, /matrix\.inverse\(\)/);
  assert.match(source('src/modules/floor-plan/domain/element-transforms.ts'), /snapRotationToAxes/);
  assert.match(source('src/modules/floor-plan/domain/element-transforms.ts'), /sensitivity = 8/);
  const styles = source('src/app/globals.css');
  assert.match(styles, /handle-nw.*nwse-resize/);
  assert.match(styles, /handle-e.*ew-resize/);
  assert.match(styles, /floor-plan-rotate-hit.*grab/);
  assert.match(scene, /width=\"100\" height=\"100\"/);
  assert.doesNotMatch(scene, /Cada quadrado = 1 m/);
  assert.match(scene, /Linha azul: junção permitida/);
  assert.match(scene, /showGrid !== false/);
  assert.match(scene, /data-floor-workspace/);
  assert.match(source('src/modules/floor-plan/domain/workspace-geometry.ts'), /workspaceBounds/);
  assert.match(editor, /Imagem adicionada e rascunho salvo/);
  assert.match(editor, /persistDraft\(editor\.state, nextDocument\)/);
  assert.match(constraints, /constrainElementToBounds/);
  assert.match(constraints, /snapElementToGrid/);
});
