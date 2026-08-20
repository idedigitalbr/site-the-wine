import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets/css/menu-flipbook.css'), 'utf8');

test('organiza o cabeçalho do modal com a logo acima dos controles', () => {
  assert.doesNotMatch(index, /<span class="flipbook-kicker">THE WINE EXPERIENCE<\/span>/);
  assert.doesNotMatch(index, /<h2 id="menuModalTitle">Cardápio<\/h2>/);
  assert.match(index, /<img class="flipbook-brand-logo" src="assets\/Logos\/logo_the_wine_branco_dourado_transparente\.webp"/);
  assert.ok(
    index.indexOf('class="flipbook-brand-logo"') < index.indexOf('class="flipbook-toolbar"'),
    'logo should appear before the toolbar'
  );
  assert.match(index, /id="menuPageInput"/);
  assert.match(index, /id="menuFullscreenBtn"/);
  assert.match(index, /id="menuDownloadBtn"/);
  assert.match(index, /id="menuModalCloseBtn"/);
});

test('remove moldura do modal e reduz os controles sem perder contraste', () => {
  assert.match(styles, /\.menu-modal-card\s*\{[\s\S]*?border:\s*none\s*!important;/);
  assert.match(styles, /\.flipbook-header\s*\{[\s\S]*?border-bottom:\s*none\s*!important;/);
  assert.match(styles, /\.flipbook-header\s*\{[\s\S]*?flex-direction:\s*column;/);
  assert.match(styles, /\.flipbook-brand-logo\s*\{[\s\S]*?max-width:/);
  assert.match(styles, /\.flipbook-toolbar\s*\{[\s\S]*?justify-content:\s*center;/);
  assert.match(styles, /\.flipbook-toolbar button,[\s\S]*?\.flipbook-toolbar a[\s\S]*?min-height:\s*28px;/);
  assert.match(styles, /\.menu-modal-close\s*\{[\s\S]*?top:\s*0\.8rem !important;[\s\S]*?right:\s*1rem !important;/);
  assert.match(styles, /@media \(max-width: 820px\)[\s\S]*?\.flipbook-brand-logo/);
});

test('oculta o controle de tela cheia somente no mobile', () => {
  assert.match(
    styles,
    /@media \(max-width: 820px\)[\s\S]*?#menuFullscreenBtn\s*\{[\s\S]*?display:\s*none\s*!important;/
  );
});

test('versiona o CSS do modal para evitar layout antigo em cache', () => {
  assert.match(index, /href="assets\/css\/menu-flipbook\.css\?v=20260820_v15"/);
});
