import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('page overlays use native JSX instead of LegacyModals', () => {
  const page = read('src/app/page.tsx');
  assert.equal(page.includes('LegacyModals'), false);
  assert.match(page, /<BookingModal/);
  assert.match(page, /<MenuModal/);
  assert.match(page, /<ReservationToast/);
});

test('booking modal preserves legacy ids and offers website and WhatsApp booking', () => {
  const source = read('src/components/reservation/BookingModal.tsx');
  assert.equal(source.includes('LegacyFragment'), false);
  assert.match(source, /id="bookingModal"/);
  assert.match(source, /id="modalCloseBtn"/);
  assert.match(source, /href="\/reservas"/);
  assert.match(source, /Reservar pelo site/);
  assert.match(source, /whatsappLinks\.reservation/);
  assert.match(source, /Reservar no WhatsApp/);
});

test('menu modal preserves the PageFlip DOM contract', () => {
  const source = read('src/components/menu/MenuModal.tsx');
  for (const id of [
    'menuModal', 'menuPrevBtn', 'menuPageInput', 'menuPageTotal',
    'menuFullscreenBtn', 'menuNextBtn', 'menuModalCloseBtn',
    'menuFlipbookStage', 'menuFlipbookPages', 'menuPdfLoading',
    'menuPdfError', 'menuRetryBtn'
  ]) {
    assert.equal(source.includes(`id="${id}"`), true, `missing ${id}`);
  }
});
