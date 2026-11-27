import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('lucide-react is the source for generic interface icons', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.equal(typeof packageJson.dependencies['lucide-react'], 'string');

  for (const file of [
    'src/components/layout/Header.tsx',
    'src/components/layout/MobileNavigation.tsx',
    'src/components/menu/MenuModal.tsx',
    'src/components/reservation/BookingModal.tsx',
    'src/components/sections/EventsSection.tsx',
    'src/components/sections/ExperiencePillarsSection.tsx',
    'src/components/sections/GallerySection.tsx',
    'src/components/layout/Footer.tsx',
  ]) {
    assert.match(read(file), /from ['"]lucide-react['"]/);
  }

  for (const relative of fs.readdirSync(path.join(root, 'src/components'), { recursive: true })) {
    if (!relative.endsWith('.tsx')) continue;
    const normalized = relative.replace(/\\/g, '/');
    if (normalized === 'icons/SocialIcons.tsx' || normalized === 'sections/AboutSection.tsx') continue;
    if (normalized === 'reservation/v2/CheckoutReservationSummary.tsx') continue;
    assert.doesNotMatch(read(`src/components/${relative}`), /<svg\b/, `${relative} still contains a hand-authored SVG`);
  }
});

test('the mobile menu uses accessible Lucide state icons', () => {
  const header = read('src/components/layout/Header.tsx');
  const behavior = read('src/behaviors/mobileNavigation.ts');

  assert.match(header, /<Menu\b/);
  assert.match(header, /<X\b/);
  assert.match(header, /aria-expanded="false"/);
  assert.match(behavior, /setAttribute\('aria-expanded', String\(isOpen\)\)/);
});
