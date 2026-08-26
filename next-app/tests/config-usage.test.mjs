import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const whatsappConsumers = [
  'src/components/layout/Header.tsx',
  'src/components/layout/MobileNavigation.tsx',
  'src/components/layout/Footer.tsx',
  'src/components/sections/PairingsSection.tsx',
  'src/components/sections/EventsSection.tsx',
  'src/components/sections/ReservationSection.tsx',
  'src/components/reservation/BookingModal.tsx',
];

test('components consume centralized WhatsApp/social configuration', () => {
  for (const file of whatsappConsumers) {
    const source = read(file);
    assert.equal(source.includes('api.whatsapp.com/send?phone=5591984040710'), false, `${file} still hardcodes WhatsApp URL`);
  }

  assert.match(read('src/components/layout/Header.tsx'), /navigation/);
  assert.match(read('src/components/layout/Header.tsx'), /socialLinks/);
  assert.match(read('src/components/layout/MobileNavigation.tsx'), /navigation/);
  assert.match(read('src/components/layout/Footer.tsx'), /socialLinks/);
});

test('menu modal consumes the centralized menu PDF path', () => {
  const source = read('src/components/menu/MenuModal.tsx');
  assert.match(source, /menuPages/);
  assert.equal(source.includes('href="/assets/CardapioMenu/CARDAPIO_THE_WINE.pdf"'), false);
});
