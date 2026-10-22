import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

const managedTargets = [
  'src/modules',
  'src/providers',
  'src/lib',
  'src/app/reservas',
  'src/app/lista-de-reservas',
  'src/app/minha-reserva',
  'src/app/admin',
  'src/app/api/customer-auth',
  'src/app/api/reservations',
  'src/app/api/admin',
  'src/app/api/internal',
  'src/app/api/payments',
  'src/app/api/webhooks',
  'src/server/reservations',
  'src/server/customer-auth',
  'src/components/account/auth',
  'src/components/ui',
  'src/components/admin',
  'src/components/account/reservations-list',
  'src/components/reservation/v2',
  'src/components/reservation/portal',
];

const expectedGate = `node scripts/check-complexity.mjs ${managedTargets.join(' ')}`;

test('package exposes complexity gate scoped to the new architecture', () => {
  assert.equal(packageJson.scripts['verify:complexity'], expectedGate);
});

test('complexity analyzer enforces cyclomatic threshold 8 and depth 3', async () => {
  const { analyzeSourceText, MAX_COMPLEXITY, MAX_DEPTH } = await import(
    '../scripts/check-complexity.mjs'
  );

  assert.equal(MAX_COMPLEXITY, 8);
  assert.equal(MAX_DEPTH, 3);

  const safe = analyzeSourceText(
    'function safe(value) { if (!value) return 0; return 1; }',
    'safe.ts',
  );
  assert.deepEqual(safe, []);

  const tooComplex = analyzeSourceText(
    `function risky(a,b,c,d,e,f,g,h) {
      if (a) return 1;
      if (b) return 2;
      if (c) return 3;
      if (d) return 4;
      if (e) return 5;
      if (f) return 6;
      if (g) return 7;
      if (h) return 8;
      return 0;
    }`,
    'risky.ts',
  );
  assert.equal(tooComplex[0]?.kind, 'complexity');

  const tooDeep = analyzeSourceText(
    `function nested(a,b,c,d) {
      if (a) {
        if (b) {
          if (c) {
            if (d) return true;
          }
        }
      }
      return false;
    }`,
    'nested.ts',
  );
  assert.equal(tooDeep.some((item) => item.kind === 'depth'), true);
});

test('analyzer accepts multiple targets and ignores paths that do not exist', async () => {
  const { analyzeTargets } = await import('../scripts/check-complexity.mjs');
  const root = mkdtempSync(join(tmpdir(), 'wine-complexity-'));
  const modules = join(root, 'modules');
  const providers = join(root, 'providers');

  mkdirSync(modules);
  mkdirSync(providers);
  writeFileSync(
    join(modules, 'safe.ts'),
    'export function safe(value) { if (!value) return 0; return 1; }',
  );
  writeFileSync(
    join(providers, 'deep.ts'),
    'export function deep(a,b,c,d) { if(a){if(b){if(c){if(d)return true;}}} return false; }',
  );

  const violations = analyzeTargets([
    modules,
    join(root, 'not-created'),
    providers,
  ]);

  assert.equal(violations.some((item) => item.kind === 'depth'), true);
});
