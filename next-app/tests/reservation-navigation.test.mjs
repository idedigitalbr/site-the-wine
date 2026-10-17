import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadReservationStore() {
  const source = readFileSync(
    new URL('../src/components/reservation/v2/useReservationWizardStore.ts', import.meta.url),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const loadedModule = { exports: {} };
  const execute = new Function('require', 'module', 'exports', compiled.outputText);
  execute(require, loadedModule, loadedModule.exports);
  return loadedModule.exports.useReservationWizardStore;
}

const useStore = loadReservationStore();

test('authenticated flow starts at Data with a lower navigation bound of 2', () => {
  const store = useStore.getState();
  store.reset();
  store.markCheckpointCompleted('data');

  useStore.getState().startAuthenticatedFlow('flow-test');

  assert.equal(useStore.getState().step, 2);
  assert.equal(useStore.getState().minimumStep, 2);
  assert.equal(useStore.getState().flowId, 'flow-test');
  assert.deepEqual(useStore.getState().completedCheckpoints, []);
});

test('authenticated navigation can return to Data but cannot cross into Seus dados', () => {
  useStore.getState().startAuthenticatedFlow('flow-test');

  for (const step of [1, 3, 2, 3, 4, 5, 4, 3, 2, 1]) {
    useStore.getState().setStep(step);
    assert.ok(useStore.getState().step >= 2, `step ${step} crossed the authenticated boundary`);
  }

  assert.equal(useStore.getState().step, 2);
});

test('flow renewal preserves the authenticated boundary and reservation checkpoints', () => {
  useStore.getState().startAuthenticatedFlow('flow-test');
  useStore.getState().markCheckpointCompleted('data');

  useStore.getState().setFlowId('renewed-flow');
  useStore.getState().setStep(1);

  assert.equal(useStore.getState().flowId, 'renewed-flow');
  assert.equal(useStore.getState().step, 2);
  assert.deepEqual(useStore.getState().completedCheckpoints, ['data']);
});

test('reset clears authentication navigation state and allows a new anonymous reservation', () => {
  useStore.getState().startAuthenticatedFlow('flow-test');
  useStore.getState().setStep(6);
  assert.equal(useStore.getState().step, 6);

  useStore.getState().reset();

  assert.equal(useStore.getState().step, 1);
  assert.equal(useStore.getState().minimumStep, 1);
  assert.equal(useStore.getState().flowId, null);
  assert.deepEqual(useStore.getState().completedCheckpoints, []);
  useStore.getState().setStep(1);
  assert.equal(useStore.getState().step, 1);
});
