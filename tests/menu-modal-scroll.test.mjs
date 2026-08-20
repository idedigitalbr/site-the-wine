import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const controller = fs.readFileSync(path.join(root, 'assets/js/menu-flipbook.js'), 'utf8');

test('restaura a posição do cardápio depois de fechar o modal', () => {
  assert.match(controller, /let menuModalScrollY = 0;/);
  assert.match(controller, /function openMenuModal\(\) \{[\s\S]*?menuModalScrollY = window\.scrollY;/);
  assert.match(
    controller,
    /function closeMenuModal\(\) \{[\s\S]*?window\.requestAnimationFrame\(\(\) => \{[\s\S]*?window\.scrollTo\(\{[\s\S]*?top: menuModalScrollY,[\s\S]*?behavior: ['"]instant['"]/,
  );
});
