import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const requiredFiles = [
  'package.json',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/components/legacy/LegacyHome.tsx',
  'src/components/legacy/LegacyBehaviorController.tsx',
  'src/components/menu/LegacyMenuScripts.tsx',
  'src/lib/legacyMarkup.ts',
  'src/behaviors/galleryLightbox.ts',
  'src/behaviors/parallax.ts',
  'src/behaviors/eventsAccordion.ts',
  'src/config/site.ts',
  'public/style.css',
  'legacy/index.html',
];

test('Next migration scaffold contains the parity-critical modules', () => {
  for (const file of requiredFiles) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `missing ${file}`);
  }
});

test('server page remains a Server Component', () => {
  const page = read('src/app/page.tsx');
  assert.equal(page.includes("'use client'"), false);
  assert.match(page, /<LegacyHome/);
});

test('legacy parser removes scripts and roots asset URLs', () => {
  const source = read('src/lib/legacyMarkup.ts');
  assert.match(source, /<script\\b/);
  assert.match(source, /\/assets\//);
  assert.match(source, /path\.join\(process\.cwd\(\), 'legacy', 'index\.html'\)/);
});

test('behavior controller composes isolated browser behaviors', () => {
  const source = read('src/components/legacy/LegacyBehaviorController.tsx');
  for (const name of ['setupHeader', 'setupMobileNavigation', 'setupReveal', 'setupScrollSpy', 'setupParallax', 'setupEventsAccordion', 'setupGalleryLightbox']) {
    assert.match(source, new RegExp(name));
  }
});
