import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = new URL('..', import.meta.url);
const source = (relativePath) => readFileSync(new URL(relativePath, root), 'utf8');

async function loadTypeScriptModule(relativePath) {
  const compiled = ts.transpileModule(source(relativePath), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: relativePath,
  });
  const encoded = Buffer.from(compiled.outputText).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

function table(id, overrides = {}) {
  return { id, kind: 'table', label: id, reservable: true, allowJoin: true, ...overrides };
}

test('join links are canonical, explicit and cleaned against table flags', async () => {
  const { normalizeJoinLinks, toggleJoinLink, hasJoinLink } = await loadTypeScriptModule('src/modules/floor-plan/domain/join-links.ts');
  const document = { elements: [table('b'), table('a'), table('disabled', { allowJoin: false }), { id: 'area-1', kind: 'area' }] };

  const normalized = normalizeJoinLinks([
    { tableIds: ['b', 'a'] },
    { tableIds: ['a', 'b'] },
    { tableIds: ['a', 'a'] },
    { tableIds: ['a', 'disabled'] },
    { tableIds: ['a', 'area-1'] },
  ], document);
  assert.deepEqual(normalized, [{ tableIds: ['a', 'b'] }]);
  assert.equal(hasJoinLink(normalized, 'b', 'a'), true);
  assert.deepEqual(toggleJoinLink({ ...document, joinLinks: normalized }, 'b', 'a', false), []);
  assert.deepEqual(toggleJoinLink({ ...document, joinLinks: [] }, 'b', 'a', true), [{ tableIds: ['a', 'b'] }]);
});
