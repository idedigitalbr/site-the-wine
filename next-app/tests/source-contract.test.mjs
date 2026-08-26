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
  'src/components/legacy/LegacyBehaviorController.tsx',
  'src/components/menu/MenuFlipbookController.tsx',
  'src/components/menu/MenuModal.tsx',
  'src/components/reservation/BookingModal.tsx',
  'src/components/reservation/ReservationToast.tsx',
  'src/behaviors/galleryLightbox.ts',
  'src/behaviors/parallax.ts',
  'src/behaviors/eventsAccordion.ts',
  'src/behaviors/menuFlipbook.ts',
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
  assert.match(page, /<Header/);
  assert.match(page, /<HeroSection/);
  assert.match(page, /<MenuFlipbookController/);
});

test('page no longer depends on legacy markup adapters', () => {
  const page = read('src/app/page.tsx');
  assert.equal(page.includes('LegacyFragment'), false);
  assert.equal(page.includes('LegacyHome'), false);
  assert.equal(page.includes('LegacyModals'), false);
  assert.equal(page.includes('LegacyMenuScripts'), false);
});

test('behavior controller composes isolated browser behaviors', () => {
  const source = read('src/components/legacy/LegacyBehaviorController.tsx');
  for (const name of ['setupHeader', 'setupMobileNavigation', 'setupReveal', 'setupScrollSpy', 'setupParallax', 'setupEventsAccordion', 'setupGalleryLightbox']) {
    assert.match(source, new RegExp(name));
  }
});

test('page is decomposed into named migration components', () => {
  const page = read('src/app/page.tsx');
  for (const name of [
    'Header', 'HeroSection', 'AboutSection', 'ExperiencePillarsSection',
    'PairingsSection', 'MenuSection', 'EventsSection', 'ReservationSection',
    'GallerySection', 'Footer', 'BookingModal', 'MenuModal', 'ReservationToast'
  ]) {
    assert.match(page, new RegExp(`<${name}`), `page missing ${name}`);
  }
});
