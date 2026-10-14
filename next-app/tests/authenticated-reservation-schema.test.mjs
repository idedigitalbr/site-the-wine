import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const requireFromTest = createRequire(import.meta.url);
const ts = requireFromTest('typescript');
const moduleCache = new Map();

function loadTypeScript(relativePath) {
  const filename = isAbsolute(relativePath)
    ? relativePath
    : fileURLToPath(new URL(relativePath, import.meta.url));
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const loaded = { exports: {} };
  moduleCache.set(filename, loaded);
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  }).outputText;
  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      let dependency = resolve(dirname(filename), specifier);
      if (!extname(dependency)) dependency += '.ts';
      return loadTypeScript(dependency);
    }
    return requireFromTest(specifier);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, loaded, loaded.exports);
  return loaded.exports;
}

test('authenticated reservation accepts preference data but rejects caller supplied identity', () => {
  const { authenticatedPublicReservationSchema } = loadTypeScript(
    '../src/modules/reservations/schemas/public-reservation-schema.ts',
  );
  const input = {
    flowId: 'A'.repeat(43),
    date: '2026-11-01',
    time: '19:00',
    guests: 2,
    duration: 120,
    tableIds: [4],
    specialNeeds: ['other'],
    notes: 'Mesa próxima à entrada.',
  };

  assert.equal(authenticatedPublicReservationSchema.safeParse(input).success, true);
  assert.equal(authenticatedPublicReservationSchema.safeParse({ ...input, name: 'Outra pessoa' }).success, false);
  assert.equal(authenticatedPublicReservationSchema.safeParse({ ...input, notes: '' }).success, false);
  assert.equal(authenticatedPublicReservationSchema.safeParse({ ...input, specialNeeds: ['none', 'other'] }).success, false);
  assert.equal(authenticatedPublicReservationSchema.safeParse({ ...input, flowId: 'short' }).success, false);
});
