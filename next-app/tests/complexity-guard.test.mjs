import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

test('package exposes the local complexity quality gate', () => {
  assert.equal(
    packageJson.scripts['verify:complexity'],
    'node scripts/check-complexity.mjs',
  );
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
