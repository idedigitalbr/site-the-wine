import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizePage,
  getSpread,
  nextPage,
  previousPage,
} from '../assets/js/menu-flipbook-state.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('normalizes a page into the valid PDF range', () => {
  assert.equal(normalizePage(0, 12), 1);
  assert.equal(normalizePage(20, 12), 12);
  assert.equal(normalizePage('4', 12), 4);
});

test('keeps the cover alone and groups the remaining pages in spreads', () => {
  assert.deepEqual(getSpread(1, 12), { current: 1, pages: [1], isCover: true });
  assert.deepEqual(getSpread(2, 12), { current: 2, pages: [2, 3], isCover: false });
  assert.deepEqual(getSpread(10, 12), { current: 10, pages: [10, 11], isCover: false });
  assert.deepEqual(getSpread(12, 12), { current: 12, pages: [12], isCover: false });
});

test('moves through cover and spreads with bounded pagination', () => {
  assert.equal(nextPage(1, 12), 2);
  assert.equal(nextPage(10, 12), 12);
  assert.equal(nextPage(12, 12), 12);
  assert.equal(previousPage(2, 12), 1);
  assert.equal(previousPage(10, 12), 8);
  assert.equal(previousPage(1, 12), 1);
});

test('contains the flipbook modal controls without a native iframe viewer', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id="menuFlipbookStage"/);
  assert.match(html, /id="menuPrevBtn"/);
  assert.match(html, /id="menuNextBtn"/);
  assert.match(html, /id="menuPageInput"/);
  assert.match(html, /CARDAPIO_THE_WINE\.pdf/);
  assert.doesNotMatch(html, /class="menu-pdf-viewer"/);
});

test('loads the flipbook controller as a classic script for file URLs', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<script src="assets\/js\/menu-flipbook\.js"><\/script>/);
  assert.doesNotMatch(html, /<script\s+type="module"[^>]+menu-flipbook/);
});

test('keeps a local page-image fallback for the PDF file protocol', () => {
  const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');
  const fallbackDir = path.join(root, 'assets/CardapioMenu/pages');

  assert.match(controller, /window\.location\.protocol === 'file:'/);
  assert.match(controller, /if \(IS_FILE_PROTOCOL\) return loadLocalPageDocument\(\);/);
  assert.match(controller, /LOCAL_PAGE_IMAGES/);
  assert.match(controller, /CARDAPIO_THE_WINE\.pdf/);

  for (let page = 1; page <= 12; page += 1) {
    const filename = `page-${String(page).padStart(2, '0')}.jpg`;
    assert.equal(fs.existsSync(path.join(fallbackDir, filename)), true, filename);
  }
});

test('defines a 3D page-turn animation on the individual pages', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/menu-flipbook.css'), 'utf8');

  assert.match(css, /\.flipbook-page-area\s*\{[\s\S]*perspective:\s*1600px/);
  assert.match(css, /\.flipbook-page\s*\{[\s\S]*backface-visibility:\s*hidden/);
  assert.match(css, /\.flipbook-page-area\.is-turning-next\s+\.flipbook-page/);
  assert.match(css, /\.flipbook-page-area\.is-turning-previous\s+\.flipbook-page/);
  assert.match(css, /rotateY\(-180deg\)/);
});
