import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appRoot, '..');

test('legacy HTML is byte-identical to the static reference', () => {
  assert.deepEqual(
    fs.readFileSync(path.join(appRoot, 'legacy/index.html')),
    fs.readFileSync(path.join(repoRoot, 'index.html')),
  );
});

test('legacy CSS is byte-identical to the static reference', () => {
  assert.deepEqual(
    fs.readFileSync(path.join(appRoot, 'public/style.css')),
    fs.readFileSync(path.join(repoRoot, 'style.css')),
  );
});
