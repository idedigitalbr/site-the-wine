import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const styles = fs.readFileSync(
  path.join(path.resolve(import.meta.dirname, '..'), 'assets/css/menu-flipbook.css'),
  'utf8'
);

test('centraliza a capa do cardápio no leitor desktop', () => {
  assert.match(
    styles,
    /@media \(min-width: 821px\)[\s\S]*?#menuFlipbookPages\.stf__parent\.is-cover canvas\s*\{[\s\S]*?left:\s*-19%\s*!important;/
  );
});
