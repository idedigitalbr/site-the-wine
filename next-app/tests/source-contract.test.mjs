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
  'src/components/behaviors/SiteBehaviorController.tsx',
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

const retiredRuntimeFiles = [
  'src/components/legacy/LegacyBehaviorController.tsx',
  'src/components/legacy/LegacyFragment.tsx',
  'src/components/legacy/LegacyHome.tsx',
  'src/components/legacy/LegacyModals.tsx',
  'src/components/menu/LegacyMenuScripts.tsx',
  'src/lib/legacyMarkup.ts',
];

test('Next migration scaffold contains the parity-critical modules', () => {
  for (const file of requiredFiles) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `missing ${file}`);
  }
});

test('legacy runtime adapters are retired after native JSX migration', () => {
  for (const file of retiredRuntimeFiles) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `obsolete runtime adapter still exists: ${file}`);
  }
});

test('server page remains a Server Component', () => {
  const page = read('src/app/page.tsx');
  assert.equal(page.includes("'use client'"), false);
  assert.match(page, /<Header/);
  assert.match(page, /<HeroSection/);
  assert.match(page, /<SiteBehaviorController/);
  assert.match(page, /<MenuFlipbookController/);
});

test('page no longer depends on legacy markup adapters', () => {
  const page = read('src/app/page.tsx');
  for (const legacyName of ['LegacyFragment', 'LegacyHome', 'LegacyModals', 'LegacyMenuScripts', 'LegacyBehaviorController']) {
    assert.equal(page.includes(legacyName), false, `page still references ${legacyName}`);
  }
});

test('site behavior controller composes isolated browser behaviors', () => {
  const source = read('src/components/behaviors/SiteBehaviorController.tsx');
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
