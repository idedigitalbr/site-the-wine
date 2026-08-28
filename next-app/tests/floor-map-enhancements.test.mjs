import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

test('floor manager supports a persistent background and reversible combinations', () => {
  const migration = source('../database/migrations/010_create_floor_plan_settings.sql');
  const ports = source('src/modules/admin/application/ports.ts');
  const schema = source('src/modules/admin/schemas/admin-schema.ts');
  const repository = source('src/modules/admin/infrastructure/mysql-admin-repository.ts');
  const composition = source('src/server/admin/composition.ts');
  const view = source('src/components/admin/AdminFloorMapView.tsx');
  const removalRoute = source('src/app/api/admin/floor-map/combinations/[id]/route.ts');

  assert.match(migration, /floor_plan_settings/);
  assert.match(migration, /background_url/);
  assert.match(ports, /AdminFloorPlanSettings/);
  assert.match(ports, /deactivateCombination/);
  assert.match(schema, /resource: z\.literal\('background'\)/);
  assert.match(repository, /updateFloorPlanSettings/);
  assert.match(repository, /UPDATE table_combinations SET active = 0/);
  assert.match(composition, /removeFloorMapCombination/);
  assert.match(view, /Fundo da planta/);
  assert.match(view, /onNodeClick/);
  assert.match(view, /Desfazer/);
  assert.match(view, /setEdges\(combinationEdges\(combinations\)\)/);
  assert.match(removalRoute, /DELETE/);
});
