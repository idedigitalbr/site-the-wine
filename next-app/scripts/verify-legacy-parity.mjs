import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appRoot, '..');

const appLegacy = fs.readFileSync(path.join(appRoot, 'legacy/index.html'));
const repoLegacy = fs.readFileSync(path.join(repoRoot, 'index.html'));
assert.deepEqual(appLegacy, repoLegacy, 'legacy/index.html divergiu do index.html de referência');

const appCss = fs.readFileSync(path.join(appRoot, 'public/style.css'));
const repoCss = fs.readFileSync(path.join(repoRoot, 'style.css'));
assert.deepEqual(appCss, repoCss, 'public/style.css divergiu do style.css de referência');

const criticalAssets = [
  'Logos/logo_the_wine_branco_dourado_transparente.webp',
  'S1 TOPO HERO/video-web-horizontal.mp4',
  'CardapioMenu/video-cardapio.mp4',
  'CardapioMenu/CARDAPIO_THE_WINE.pdf',
  'js/page-flip.browser.js',
  'js/menu-flipbook.js',
  'css/menu-flipbook.css',
];

for (const relative of criticalAssets) {
  const appAsset = fs.readFileSync(path.join(appRoot, 'public/assets', relative));
  const repoAsset = fs.readFileSync(path.join(repoRoot, 'assets', relative));
  assert.deepEqual(appAsset, repoAsset, `asset divergente: ${relative}`);
}

console.log('Legacy parity files verified.');
