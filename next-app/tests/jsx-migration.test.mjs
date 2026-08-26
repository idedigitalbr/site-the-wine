import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const migratedSections = [
  ['src/components/layout/Header.tsx', ['id="navbar"', 'MobileNavigation', 'hamburgerBtn']],
  ['src/components/sections/HeroSection.tsx', ['id="home"', 'hero parallax-container', 'video-web-horizontal.mp4']],
  ['src/components/sections/AboutSection.tsx', ['id="sobre"', 'historia-section', 'bg-sobernoszinho-internet.webp']],
  ['src/components/sections/ExperiencePillarsSection.tsx', ['id="experiencia"', 'mvv-section', 'garrafas-vinho-cartuxa-tapada.webp']],
  ['src/components/sections/PairingsSection.tsx', ['id="gastronomia"', 'split-section-v2', 'S3-TACA-VINHO.webp']],
];

test('priority sections are native JSX and preserve critical legacy selectors/assets', () => {
  for (const [file, needles] of migratedSections) {
    const source = read(file);
    assert.equal(source.includes('LegacyFragment'), false, `${file} still depends on LegacyFragment`);

    for (const needle of needles) {
      assert.equal(source.includes(needle), true, `${file} missing ${needle}`);
    }
  }
});

test('mobile navigation is isolated as its own JSX component', () => {
  const source = read('src/components/layout/MobileNavigation.tsx');
  assert.equal(source.includes('LegacyFragment'), false);
  assert.match(source, /id="mobileOverlay"/);
  assert.match(source, /id="mobileNav"/);
  assert.match(source, /id="mobileNavClose"/);
  assert.match(source, /mobile-nav-link/);
});
