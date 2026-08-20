import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'assets/css/menu-flipbook.css'), 'utf8');

test('pausa os vídeos de fundo enquanto o modal do cardápio está aberto', () => {
  assert.match(controller, /let pausedBackgroundVideos = \[\];/);
  assert.match(controller, /function setBackgroundVideosPaused\(paused\)/);
  assert.match(controller, /document\.querySelectorAll\(['"]video['"]\)/);
  assert.match(controller, /!elements\.modal\?\.contains\(video\)/);
  assert.match(controller, /video\.addEventListener\(['"]play['"], preventBackgroundPlayback\)/);
  assert.match(controller, /video\.removeEventListener\(['"]play['"], handler\)/);
  assert.match(controller, /backgroundVideos\.forEach\(\(video\) => \{[\s\S]*?video\.pause\(\)/);
  assert.match(controller, /pausedBackgroundVideos\.forEach\(\(video\) => \{[\s\S]*?video\.play\(\)\.catch/);
});

test('liga e desliga a pausa junto com a abertura e o fechamento do modal', () => {
  assert.match(controller, /function openMenuModal\(\) \{[\s\S]*?setBackgroundVideosPaused\(true\);/);
  assert.match(controller, /function closeMenuModal\(\) \{[\s\S]*?setBackgroundVideosPaused\(false\);/);
});

test('congela as animações da página fora do modal', () => {
  assert.match(styles, /html\.menu-modal-open body > \*:not\(#menuModal\)[\s\S]*?animation-play-state:\s*paused\s*!important/);
});
