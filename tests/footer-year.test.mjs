import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('mantém o ano do rodapé atualizado automaticamente', () => {
  assert.match(index, /id=["']currentYear["'][^>]*>2026</);
  assert.match(index, /getElementById\(["']currentYear["']\)/);
  assert.match(index, /textContent\s*=\s*new Date\(\)\.getFullYear\(\)/);
  assert.doesNotMatch(index, /©\s*2024/);
});
