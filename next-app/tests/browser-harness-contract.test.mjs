import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const requiredViewports = [
  '1440x900',
  '1366x768',
  '1024x768',
  '820x1180',
  '768x1024',
  '430x932',
  '390x844',
  '360x800',
];

test('visual parity harness preserves all acceptance viewports', () => {
  const source = read('tests/browser/visual-parity.spec.ts');

  for (const viewport of requiredViewports) {
    assert.equal(source.includes(`name: '${viewport}'`), true, `missing viewport ${viewport}`);
  }

  assert.match(source, /pixelmatch/);
  assert.match(source, /MAX_DIFF_RATIO = 0\.01/);
  assert.match(source, /fullPage: true/);
});

test('visual parity harness covers critical interactive states', () => {
  const source = read('tests/browser/visual-parity.spec.ts');

  for (const state of [
    'mobile drawer visual parity',
    'mobile events selected panel visual parity',
    'lightbox visual parity',
    'menu modal visual parity',
  ]) {
    assert.equal(source.includes(state), true, `missing visual state: ${state}`);
  }
});

test('Playwright starts legacy and Next locally without production deploy', () => {
  const config = read('playwright.config.ts');

  assert.match(config, /node scripts\/serve-legacy\.mjs/);
  assert.match(config, /127\.0\.0\.1:4173/);
  assert.match(config, /npm run dev -- -p 4174/);
  assert.match(config, /127\.0\.0\.1:4174/);
  assert.equal(config.includes('deploy'), false);
});

test('package exposes explicit functional and visual commands', () => {
  const pkg = JSON.parse(read('package.json'));

  assert.equal(pkg.scripts['test:functional'], 'playwright test tests/browser/functional-parity.spec.ts');
  assert.equal(pkg.scripts['test:visual'], 'playwright test tests/browser/visual-parity.spec.ts');
  assert.equal(pkg.scripts['browser:install'], 'playwright install chromium');
});
