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
  assert.match(html, /<script src="assets\/js\/menu-flipbook\.js(?:\?[^\"]*)?"><\/script>/);
  assert.doesNotMatch(html, /<script\s+type="module"[^>]+menu-flipbook/);
});

test('versiona os assets do flipbook para evitar mistura com cache antigo', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const version = 'v=20260814_v8';

  for (const asset of [
    `style.css?${version}`,
    `assets/css/menu-flipbook.css?${version}`,
    `assets/js/page-flip.browser.js?${version}`,
    `assets/js/menu-flipbook.js?${version}`,
  ]) {
    assert.ok(html.includes(asset), `${asset} should invalidate stale browser caches`);
  }
});

test('compacta o topo e amplia a área do leitor em telas grandes', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/menu-flipbook.css'), 'utf8');

  assert.match(css, /width:\s*min\(1440px,\s*calc\(100vw - 1rem\)\)/);
  assert.match(css, /max-width:\s*1440px/);
  assert.match(css, /height:\s*min\(96vh,\s*960px\)/);
  assert.match(css, /min-height:\s*60px/);
  assert.match(css, /\.flipbook-header > \.flipbook-toolbar[\s\S]*min-height:\s*44px/);
  assert.match(css, /#menuFlipbookPages\.stf__parent[\s\S]*height:\s*calc\(100% - 0\.35rem\)/);
});

test('uses local PDF-derived page images so file URLs avoid PDF CORS requests', () => {
  const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');

  assert.match(controller, /LOCAL_PAGE_IMAGES/);
  assert.match(controller, /loadFromImages\(getPageImagesForViewport\(\)\)/);
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

test('renderiza o canvas em alta densidade para manter o texto nítido', () => {
  const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');

  assert.match(controller, /devicePixelRatio/);
  assert.match(controller, /setTransform\(pixelRatio, 0, 0, pixelRatio, 0, 0\)/);

  const readyWait = controller.indexOf(
    'await new Promise((resolve) => window.setTimeout(resolve, 80));'
  );
  const resolutionUpdate = controller.indexOf('updateCanvasResolution();');
  assert.ok(readyWait < resolutionUpdate, 'resolution should be applied after StPageFlip initializes');
});

test('ships high-resolution local page assets for readable menu text', () => {
  const pagesDir = path.join(root, 'assets/CardapioMenu/pages');

  for (let page = 1; page <= 12; page += 1) {
    const filename = `page-${String(page).padStart(2, '0')}.png`;
    const stats = fs.statSync(path.join(pagesDir, filename));
    assert.ok(stats.size >= 400_000, `${filename} should use the high-resolution PNG render`);
  }
});

test('usa páginas nítidas e renderização de alta densidade no mobile', () => {
  const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');
  const mobilePagesDir = path.join(root, 'assets/CardapioMenu/pages/mobile');

  assert.match(controller, /MOBILE_PAGE_IMAGES/);
  assert.match(controller, /getPageImagesForViewport/);
  assert.match(controller, /loadFromImages\(getPageImagesForViewport\(\)\)/);
  assert.match(
    controller,
    /const pixelRatio = mobile\s*\?\s*Math\.min\(window\.devicePixelRatio \|\| 1, 3\)/,
  );
  assert.match(controller, /settings\.minWidth = PAGE_FLIP_OPTIONS\.minWidth/);
  assert.doesNotMatch(controller, /settings\.minWidth = mobile \? 10000/);
  assert.match(controller, /settings\.drawShadow = !mobile/);

  for (let page = 1; page <= 12; page += 1) {
    const filename = `page-${String(page).padStart(2, '0')}.webp`;
    assert.equal(fs.existsSync(path.join(mobilePagesDir, filename)), true, filename);
  }
});

function readWebpDimensions(filename) {
  const bytes = fs.readFileSync(filename);
  const chunk = bytes.toString('ascii', 12, 16);

  if (chunk === 'VP8 ') {
    return {
      width: bytes.readUInt16LE(26) & 0x3fff,
      height: bytes.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunk === 'VP8X') {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    };
  }

  throw new Error(`Unsupported WebP chunk: ${chunk}`);
}

test('usa controles de ação com ícones e preserva resolução maior no mobile', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');
  const mobilePagesDir = path.join(root, 'assets/CardapioMenu/pages/mobile');

  assert.match(html, /id="menuFullscreenBtn"[^>]*aria-label="Abrir tela cheia"[^>]*title="Abrir tela cheia"[\s\S]*?<svg/);
  assert.match(html, /id="menuDownloadBtn"[^>]*aria-label="Baixar PDF"[^>]*title="Baixar PDF"[\s\S]*?<svg/);
  assert.doesNotMatch(html, /menuZoomOut|menuZoomIn|menuFitBtn/);
  assert.doesNotMatch(controller, /zoomOut:|zoomIn:|fit:|elements\.(zoomOut|zoomIn|fit)/);
  assert.match(
    controller,
    /const pixelRatio = mobile\s*\?\s*Math\.min\(window\.devicePixelRatio \|\| 1, 3\)/,
  );

  for (let page = 1; page <= 12; page += 1) {
    const filename = `page-${String(page).padStart(2, '0')}.webp`;
    const dimensions = readWebpDimensions(path.join(mobilePagesDir, filename));
    assert.deepEqual(dimensions, { width: 1862, height: 2632 }, filename);
  }
});

test('preenche a viewport mobile sem reservar colunas para as setas', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/menu-flipbook.css'), 'utf8');

  assert.match(css, /\.menu-modal-overlay\s*\{[\s\S]*padding:\s*0 !important/);
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /#menuFlipbookPages,[\s\S]*#menuFlipbookPages\.stf__parent\s*\{[\s\S]*width:\s*calc\(100% - 0\.6rem\)/);
  assert.match(css, /#menuFlipbookPages,[\s\S]*#menuFlipbookPages\.stf__parent\s*\{[\s\S]*height:\s*100%/);
  assert.match(css, /\.flipbook-nav-prev\s*\{\s*left:\s*0\.25rem/);
  assert.match(css, /\.flipbook-nav-next\s*\{\s*right:\s*0\.25rem/);
});

test('mantém as setas discretas e sem hover dourado persistente no mobile', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/menu-flipbook.css'), 'utf8');

  assert.match(css, /@media \(max-width: 820px\)[\s\S]*\.flipbook-nav[\s\S]*background:\s*rgba\(5, 4, 3, 0\.24\)/);
  assert.match(css, /\.flipbook-nav:hover:not\(:disabled\)[\s\S]*background:\s*rgba\(5, 4, 3, 0\.32\)/);
  assert.match(css, /\.flipbook-nav:active:not\(:disabled\)/);
});

test('suporta pinça para zoom e swipe touch para paginação', () => {
  const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'assets/css/menu-flipbook.css'), 'utf8');

  assert.match(controller, /function getTouchDistance/);
  assert.match(controller, /function bindTouchZoom/);
  assert.match(controller, /touchstart/);
  assert.match(controller, /touchmove/);
  assert.match(controller, /touchend/);
  assert.match(controller, /preventDefault\(\)/);
  assert.match(controller, /mobileScrollSupport: false/);
  assert.match(controller, /swipeDistance: 30/);
  assert.match(css, /#menuFlipbookStage[\s\S]*touch-action:\s*none/);
});
