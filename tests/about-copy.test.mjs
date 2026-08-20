import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const index = fs.readFileSync(
  path.join(path.resolve(import.meta.dirname, '..'), 'index.html'),
  'utf8'
);

test('quebra o texto destacado da seção Sobre depois da vírgula', () => {
  assert.match(
    index,
    /<p class="highlighted-text">\s*Um ambiente sofisticado para brindar,<br>compartilhar e viver novas experiências\.\s*<\/p>/
  );
});
