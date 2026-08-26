import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
const legacyDockerfile = fs.readFileSync(path.join(root, 'Dockerfile.legacy'), 'utf8');
const dockerignore = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8');
const compose = fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/deploy-vps.yml'), 'utf8');

test('imagem de produção compila e executa o Next em modo standalone', () => {
  assert.match(dockerfile, /FROM node:22-alpine AS deps/);
  assert.match(dockerfile, /COPY next-app\/package\.json next-app\/package-lock\.json/);
  assert.match(dockerfile, /RUN npm ci/);
  assert.match(dockerfile, /RUN npm run build/);
  assert.match(dockerfile, /COPY --from=builder[\s\S]+\.next\/standalone/);
  assert.match(dockerfile, /EXPOSE 3000/);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/);
  assert.doesNotMatch(dockerfile, /nginx/);
});

test('imagem legada permanece disponível apenas como backup isolado', () => {
  assert.match(legacyDockerfile, /COPY index\.html style\.css/);
  assert.match(legacyDockerfile, /COPY assets/);
  assert.match(compose, /legacy-backup:/);
  assert.match(compose, /dockerfile: Dockerfile\.legacy/);
  assert.match(compose, /legacy:\s*\n\s*internal: true/);
  assert.doesNotMatch(compose, /legacy-backup:[\s\S]*?traefik\./);
});

test('.dockerignore exclui codigo e artefatos que nao pertencem ao site publicado', () => {
  for (const entry of ['node_modules', '.MD', '.agents', 'docs', 'tests', '.github', 'next-app/node_modules', 'next-app/.next']) {
    assert.match(dockerignore, new RegExp(`^${entry.replace('.', '\\.')}/?$`, 'm'));
  }
});

test('Compose publica o Next no Traefik e mantém MySQL sem porta pública', () => {
  assert.match(compose, /container_name: thewine-web/);
  assert.match(compose, /traefik\.http\.services\.thewine-service\.loadbalancer\.server\.port=3000/);
  assert.match(compose, /image: mysql:8\.0/);
  assert.match(compose, /DATABASE_HOST: thewine-db/);
  assert.match(compose, /thewine_mysql_data:\/var\/lib\/mysql/);
  assert.match(compose, /MYSQL_PASSWORD:\s*\$\{MYSQL_PASSWORD:\?MYSQL_PASSWORD must be set\}/);
  assert.match(compose, /healthcheck:/);
  assert.doesNotMatch(compose, /db:[\s\S]*?ports:/);
});

test('deploy permanece restrito a main e a validação desta branch é local', () => {
  assert.match(workflow, /push:\s*[\s\S]*branches:\s*[\s\S]*- main/);
  assert.doesNotMatch(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /node --test tests\/\*\.test\.mjs/);
  assert.doesNotMatch(workflow, /needs:\s*test/);
  assert.match(workflow, /git fetch origin main/);
  assert.match(workflow, /git reset --hard origin\/main/);
});
