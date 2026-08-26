import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');

test('modal animation compatibility targets the native Next DOM', () => {
  assert.equal(css.includes('#legacy-root'), false);
  assert.match(css, /body > \*:not\(#menuModal\)/);
  assert.match(css, /#menuModal \*/);
});
