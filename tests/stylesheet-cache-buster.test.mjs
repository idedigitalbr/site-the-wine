import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('usa um cache-buster novo para o stylesheet principal', () => {
  assert.match(index, /href=["']style\.css\?v=20260820_v9["']/);
  assert.doesNotMatch(index, /href=["']style\.css\?v=20260814_v8["']/);
});
