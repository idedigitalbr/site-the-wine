import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

async function load(relativePath) {
  const compiled = ts.transpileModule(readFileSync(new URL(relativePath, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: relativePath,
  });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
}

test('automatic allocation chooses a deterministic best fit without client table ids', async () => {
  const { selectBestAvailableOption } = await load('../src/modules/reservations/domain/reservation-allocation.ts');
  const options = [
    { tableIds: [2, 3], combinationId: 10, capacityMin: 2, capacityMax: 12 },
    { tableIds: [1], combinationId: null, capacityMin: 1, capacityMax: 8 },
    { tableIds: [4], combinationId: null, capacityMin: 2, capacityMax: 6 },
  ];

  assert.deepEqual(selectBestAvailableOption(options, 6), options[2]);
  assert.deepEqual(selectBestAvailableOption(options, 8), options[1]);
  assert.equal(selectBestAvailableOption(options, 20), null);
});

test('automatic allocation never treats visual table groups as physical allocations', async () => {
  const { selectBestAvailableOption } = await load('../src/modules/reservations/domain/reservation-allocation.ts');
  const options = [{ tableIds: [9, 10], combinationId: 3, capacityMin: 4, capacityMax: 12 }];
  const selected = selectBestAvailableOption(options, 9);

  assert.deepEqual(selected?.tableIds, [9, 10]);
  assert.notEqual(selected?.tableIds.length, 3);
});
