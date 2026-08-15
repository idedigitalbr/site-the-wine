import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('centraliza o card ativo ao tocar em um evento no mobile', () => {
  assert.match(index, /panels\.forEach\(p\s*=>\s*p\.classList\.remove\(['"]tw-acc__panel--active['"]\)\)/);
  assert.match(index, /event\.preventDefault\(\)/);
  assert.match(index, /event\.stopPropagation\(\)/);
  assert.match(index, /panel\.scrollIntoView\(\{[\s\S]*block:\s*['"]center['"]/);
});
