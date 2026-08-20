import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const styles = fs.readFileSync(
  path.join(path.resolve(import.meta.dirname, '..'), 'assets/css/menu-flipbook.css'),
  'utf8'
);
const controller = fs.readFileSync(
  path.join(path.resolve(import.meta.dirname, '..'), 'assets/js/menu-flipbook.js'),
  'utf8'
);

test('centraliza a capa do cardápio no leitor desktop', () => {
  assert.match(
    styles,
    /@media \(min-width: 821px\)[\s\S]*?#menuFlipbookPages\.stf__parent\.is-cover canvas\s*\{[\s\S]*?left:\s*0;/
  );
});

test('calcula o deslocamento da capa conforme o tamanho real do leitor', () => {
  assert.match(controller, /function centerCoverPage\(\)/);
  assert.match(controller, /pageFlip\.getBoundsRect\?\.\(\)/);
  assert.match(controller, /stageRect\.left[\s\S]*stageRect\.width\s*\/\s*2/);
  assert.match(controller, /canvas\.style\.left/);
  assert.match(controller, /centerCoverPage\(\);/);
});
