import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = new URL('..', import.meta.url);
const source = (path) => readFileSync(new URL(path, root), 'utf8');

async function loadTypeScriptModule(relativePath) {
  const compiled = ts.transpileModule(source(relativePath), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, fileName: relativePath });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
}

test('background starts with 50 m on the longest side and keeps its center', async () => {
  const { initialBackground, backgroundBounds } = await loadTypeScriptModule('src/modules/floor-plan/domain/background-geometry.ts');
  const background = initialBackground('123', 'planta.png', 2400, 1200, { x: 5000, y: 5000 });
  assert.equal(Math.max(background.width, background.height), 5000);
  assert.equal(background.width / background.height, 2);
  assert.deepEqual(backgroundBounds(background), { x: 2500, y: 3750, width: 5000, height: 2500 });
});

test('background resizing preserves aspect ratio and opposite-side anchoring', async () => {
  const { resizeBackground } = await loadTypeScriptModule('src/modules/floor-plan/domain/background-geometry.ts');
  const original = { assetId: '123', name: 'planta', naturalWidth: 2, naturalHeight: 1, x: 5000, y: 5000, width: 1000, height: 500, keepAspectRatio: true };
  const resized = resizeBackground(original, 'se', { x: 200, y: 20 });
  assert.equal(resized.width, 1200);
  assert.equal(resized.height, 600);
  assert.equal(resized.x, 5100);
  assert.equal(resized.y, 5050);
});

test('fit uses the image bounds and 24 pixel margins', async () => {
  const { viewportForBounds } = await loadTypeScriptModule('src/modules/floor-plan/domain/viewport.ts');
  const viewport = viewportForBounds({ x: 100, y: 200, width: 1000, height: 500 }, 1024, 768);
  assert.equal(viewport.zoom, 0.976);
  assert.ok(Math.abs(viewport.x - (24 - 100 * viewport.zoom)) < 1e-9);
  assert.ok(Math.abs(viewport.y - (384 - 450 * viewport.zoom)) < 1e-9);
});

test('scene fit accounts for the SVG document scale', async () => {
  const { viewportForSceneBounds } = await loadTypeScriptModule('src/modules/floor-plan/domain/viewport.ts');
  const viewport = viewportForSceneBounds({ x: 200, y: 200, width: 10000, height: 5628 }, 10400, 6028, 740, 560, 24);
  assert.ok(viewport.zoom > .9);
  assert.ok(viewport.x > 0);
  assert.ok(viewport.y > 0);
});

test('background flow stores only an asset reference and removes creation tools', () => {
  const model = source('src/modules/floor-plan/domain/model.ts');
  const palette = source('src/components/admin/floor-plan/FloorPlanPalette.tsx');
  const editor = source('src/components/admin/FloorPlanEditorView.tsx');
  const uploadRoute = source('src/app/api/admin/floor-plan/assets/route.ts');
  const publicRoute = source('src/app/api/floor-plan-assets/[id]/route.ts');
  const scene = source('src/components/floor-plan/FloorPlanScene.tsx');
  const canvas = source('src/components/admin/floor-plan/FloorPlanCanvas.tsx');
  const properties = source('src/components/admin/floor-plan/FloorPlanBackgroundProperties.tsx');
  const backgroundSettings = source('src/components/admin/floor-plan/FloorPlanBackgroundSettings.tsx');
  const normalize = source('src/modules/floor-plan/domain/normalize-document.ts');
  assert.match(model, /background: FloorPlanBackground \| null/);
  assert.match(editor, /initialBackground/);
  assert.doesNotMatch(palette, /Parede|Área|Entrada|Janela|Itens/);
  assert.match(uploadRoute, /floor-plan-assets/);
  assert.match(publicRoute, /Cache-Control/);
  assert.doesNotMatch(editor, /data:image/);
  assert.match(scene, /Editar imagem de fundo/);
  assert.match(scene, /data-floor-background-pencil/);
  assert.match(scene, /onBackgroundSelect/);
  assert.match(canvas, /onBackgroundPencil/);
  assert.match(properties, /Permitir alterar tamanho e giro no mapa/);
  assert.match(properties, /Permitir arrastar imagem no mapa/);
  assert.match(backgroundSettings, /onUpload/);
  assert.doesNotMatch(backgroundSettings, /onChange:|onRemove:|onToggleEditing:|inTools/);
  assert.match(normalize, /allowTransform: value\.allowTransform === true/);
  assert.match(normalize, /allowDrag: value\.allowDrag === true/);
  assert.match(normalize, /kind !== 'table'/);
  const repository = source('src/modules/floor-plan/infrastructure/mysql-floor-plan-repository.ts');
  assert.doesNotMatch(repository, /SELECT id,name FROM dining_areas/);
  assert.doesNotMatch(repository, /AreaRow/);
  assert.doesNotMatch(repository, /areaName/);
});
