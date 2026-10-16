import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function load(relativePath, parent = fileURLToPath(import.meta.url)) {
  const filename = resolve(dirname(parent), relativePath);
  const source = readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: filename.pathname,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (!specifier.startsWith('.')) return require(specifier);
    let dependency = resolve(dirname(filename), specifier);
    if (!extname(dependency)) dependency += '.ts';
    return load(dependency, filename);
  };
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}

test('new reservation writes accept empty needs and reject historical none', () => {
  const { authenticatedPublicReservationSchema } = load('../src/modules/reservations/schemas/public-reservation-schema.ts');
  const base = {
    flowId: 'A'.repeat(43), date: '2026-11-01', time: '19:00', guests: 2, duration: 120,
    tableIds: [4], notes: '',
  };
  assert.equal(authenticatedPublicReservationSchema.safeParse({ ...base, specialNeeds: [] }).success, true);
  assert.equal(authenticatedPublicReservationSchema.safeParse({ ...base, specialNeeds: ['none'] }).success, false);
  assert.equal(authenticatedPublicReservationSchema.safeParse({ ...base, specialNeeds: ['other'] }).success, false);
  assert.equal(authenticatedPublicReservationSchema.safeParse({ ...base, specialNeeds: ['other'], notes: 'Sem lactose.' }).success, true);
});

test('historical preference reader keeps none available for display', () => {
  const { historicalReservationPreferencesSchema } = load('../src/modules/reservations/schemas/reservation-write-schema.ts');
  assert.equal(historicalReservationPreferencesSchema.safeParse({ specialNeeds: ['none'], notes: '' }).success, true);
});
