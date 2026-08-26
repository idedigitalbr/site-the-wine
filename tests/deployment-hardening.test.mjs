import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const dockerignore = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy-vps.yml'), 'utf8');

test('imagem nginx publica somente os arquivos necessarios do site', () => {
  assert.doesNotMatch(dockerfile, /^\s*COPY\s+\.\s+/m);
  assert.match(dockerfile, /^\s*COPY\s+index\.html\s+/m);
  assert.match(dockerfile, /^\s*COPY\s+style\.css\s+/m);
  assert.match(dockerfile, /^\s*COPY\s+assets\s+/m);
});

test('.dockerignore exclui codigo e artefatos que nao pertencem ao site publicado', () => {
  for (const entry of ['node_modules', '.MD', '.agents', 'docs', 'tests', '.github']) {
    assert.match(dockerignore, new RegExp(`^${entry.replace('.', '\\.')}/?$`, 'm'));
  }
});

test('deploy permanece restrito a main e a validação desta branch é local', () => {
  assert.match(workflow, /push:\s*[\s\S]*branches:\s*[\s\S]*- main/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /node --test tests\/\*\.test\.mjs/);
  assert.doesNotMatch(workflow, /needs:\s*test/);
  assert.match(workflow, /git fetch origin main/);
  assert.match(workflow, /git reset --hard origin\/main/);
});
