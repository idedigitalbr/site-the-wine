import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets/css/menu-flipbook.css'), 'utf8');

test('posiciona as setas de paginação no topo do modal', () => {
  const previous = index.indexOf('id="menuPrevBtn"');
  const pageControl = index.indexOf('class="flipbook-page-control"');
  const download = index.indexOf('id="menuDownloadBtn"');
  const next = index.indexOf('id="menuNextBtn"');
  const reader = index.indexOf('id="menuFlipbookStage"');

  assert.ok(previous >= 0 && pageControl >= 0 && previous < pageControl);
  assert.ok(download >= 0 && next >= 0 && download < next);
  assert.ok(next < reader, 'as setas devem ficar no cabeçalho, antes do leitor');
  assert.equal(index.match(/id="menuPrevBtn"/g)?.length, 1);
  assert.equal(index.match(/id="menuNextBtn"/g)?.length, 1);
});

test('usa as mesmas dimensões dos ícones para as setas do topo', () => {
  assert.ok(styles.includes('.flipbook-toolbar .flipbook-toolbar-nav {'));
  assert.ok(styles.includes('width: 28px !important;'));
  assert.ok(styles.includes('height: 28px !important;'));
  assert.ok(styles.includes('.flipbook-toolbar .flipbook-nav-prev,'));
  assert.ok(styles.includes('position: static !important;'));
  assert.ok(styles.includes('.flipbook-reader > .flipbook-nav {'));
  assert.ok(styles.includes('display: none !important;'));
  assert.ok(styles.includes('width: 26px !important;'));
  assert.ok(styles.includes('height: 26px !important;'));
});
