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

  assert.ok(
    html.indexOf('class="flipbook-toolbar"') < html.indexOf('id="menuFlipbookStage"'),
    'toolbar should appear above the reader'
  );
});

test('loads the flipbook controller as a classic script for file URLs', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<script src="assets\/js\/menu-flipbook\.js"><\/script>/);
  assert.doesNotMatch(html, /<script\s+type="module"[^>]+menu-flipbook/);
});

test('uses local PDF-derived page images so file URLs avoid PDF CORS requests', () => {
  const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');

  assert.match(controller, /LOCAL_PAGE_IMAGES/);
  assert.match(controller, /loadFromImages\(LOCAL_PAGE_IMAGES\)/);
  assert.match(controller, /CARDAPIO_THE_WINE\.pdf/);

  const pagesDir = path.join(root, 'assets/CardapioMenu/pages');
  for (let page = 1; page <= 12; page += 1) {
    const filename = `page-${String(page).padStart(2, '0')}.png`;
    assert.equal(fs.existsSync(path.join(pagesDir, filename)), true, filename);
  }
});

test('styles the StPageFlip canvas as a centered book', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/menu-flipbook.css'), 'utf8');

  assert.match(css, /#menuFlipbookPages/);
  assert.match(css, /\.stf__parent/);
  assert.match(css, /\.stf__block/);
});

test('uses a local page-flip engine to turn one sheet at a time', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');

  assert.match(html, /assets\/js\/page-flip\.browser\.js/);
  assert.equal(fs.existsSync(path.join(root, 'assets/js/page-flip.browser.js')), true);
  assert.match(controller, /new (?:window\.)?St\.PageFlip/);
  assert.match(controller, /loadFromImages/);
  assert.match(controller, /flipNext/);
  assert.match(controller, /flipPrev/);
  assert.match(controller, /turnToPage/);
  assert.match(controller, /disableFlipByClick: false/);
  assert.match(controller, /max-width: 820px/);
});

test('keeps the unused canvas area transparent instead of white', () => {
  const engine = fs.readFileSync(path.join(root, 'assets/js/page-flip.browser.js'), 'utf8');

  assert.match(
    engine,
    /clear\(\)\{this\.ctx\.clearRect\(0,0,this\.canvas\.width,this\.canvas\.height\)\}/
  );
});

test('ships high-resolution local page assets for readable menu text', () => {
  const pagesDir = path.join(root, 'assets/CardapioMenu/pages');

  for (let page = 1; page <= 12; page += 1) {
    const filename = `page-${String(page).padStart(2, '0')}.png`;
    const stats = fs.statSync(path.join(pagesDir, filename));
    assert.ok(stats.size >= 400_000, `${filename} should use the high-resolution PNG render`);
  }
});
