import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const eslintConfig = readFileSync(
  new URL('../eslint.config.mjs', import.meta.url),
  'utf8',
);

test('lint command is scoped to new reservation code during parity phase', () => {
  const lint = packageJson.scripts.lint;

  assert.match(lint, /eslint/);
  assert.match(lint, /src\/modules/);
  assert.match(lint, /src\/providers/);
  assert.match(lint, /src\/app\/reservas/);
  assert.match(lint, /src\/app\/admin/);
  assert.match(lint, /--no-error-on-unmatched-pattern/);
  assert.doesNotMatch(lint, /eslint src(?:\s|$)/);
});

test('eslint config enforces maintainability thresholds on new code', () => {
  assert.match(eslintConfig, /eslint-config-next\/core-web-vitals/);
  assert.match(eslintConfig, /eslint-plugin-sonarjs/);
  assert.match(eslintConfig, /complexity:\s*\['error',\s*8\]/);
  assert.match(eslintConfig, /'max-depth':\s*\['error',\s*3\]/);
  assert.match(
    eslintConfig,
    /'sonarjs\/cognitive-complexity':\s*\['error',\s*10\]/,
  );
});
