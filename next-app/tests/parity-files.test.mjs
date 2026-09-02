import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appRoot, '..');

test('legacy HTML is byte-identical to the static reference', (t) => {
  const legacyFile = path.join(repoRoot, 'nao-usado-mais/index.html');
  if (!fs.existsSync(legacyFile)) {
    t.skip('Arquivos legados arquivados em .rar');
    return;
  }
  assert.deepEqual(
    fs.readFileSync(path.join(appRoot, 'legacy/index.html')),
    fs.readFileSync(legacyFile),
  );
});

test('legacy CSS is byte-identical to the static reference', (t) => {
  const legacyCss = path.join(repoRoot, 'nao-usado-mais/style.css');
  if (!fs.existsSync(legacyCss)) {
    t.skip('Arquivos legados arquivados em .rar');
    return;
  }
  assert.deepEqual(
    fs.readFileSync(path.join(appRoot, 'public/style.css')),
    fs.readFileSync(legacyCss),
  );
});

