import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const components = JSON.parse(readFileSync(new URL('../components.json', import.meta.url), 'utf8'));

const requiredRuntimePackages = [
  '@hookform/resolvers',
  '@tanstack/react-query',
  '@tanstack/react-table',
  'class-variance-authority',
  'clsx',
  'motion',
  'react-hook-form',
  'recharts',
  'tailwind-merge',
  'tw-animate-css',
  'zod',
  'zustand',
];

const requiredDevelopmentPackages = [
  '@tailwindcss/postcss',
  'eslint',
  'eslint-config-next',
  'eslint-plugin-sonarjs',
  'postcss',
  'shadcn',
  'tailwindcss',
];

test('shadcn config targets the new UI layer and Tailwind v4 conventions', () => {
  assert.equal(components.style, 'new-york');
  assert.equal(components.rsc, true);
  assert.equal(components.tsx, true);
  assert.equal(components.tailwind.config, '');
  assert.equal(components.tailwind.css, 'src/app/globals.css');
  assert.equal(components.tailwind.cssVariables, true);
  assert.equal(components.aliases.ui, '@/components/ui');
  assert.equal(components.aliases.utils, '@/lib/utils');
  assert.equal(components.iconLibrary, 'lucide');
});

test('foundation dependency manifest contains every planned library', async () => {
  const { developmentDependencies, runtimeDependencies } = await import(
    '../scripts/foundation-dependencies.mjs'
  );

  for (const packageName of requiredRuntimePackages) {
    assert.equal(
      runtimeDependencies.some((dependency) => dependency.startsWith(`${packageName}@`)),
      true,
      `missing runtime dependency ${packageName}`,
    );
  }

  for (const packageName of requiredDevelopmentPackages) {
    assert.equal(
      developmentDependencies.some((dependency) => dependency.startsWith(`${packageName}@`)),
      true,
      `missing development dependency ${packageName}`,
    );
  }
});

test('setup command is explicit and supports a network-free dry run', () => {
  assert.equal(
    packageJson.scripts['setup:reservation-foundation'],
    'node scripts/install-reservation-foundation.mjs',
  );
  assert.equal(
    packageJson.scripts['setup:reservation-foundation:dry-run'],
    'node scripts/install-reservation-foundation.mjs --dry-run',
  );

  const result = spawnSync(
    process.execPath,
    ['scripts/install-reservation-foundation.mjs', '--dry-run'],
    { cwd: root, encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /npm install .*@tanstack\/react-query/);
  assert.match(result.stdout, /npm install --save-dev .*tailwindcss/);
  assert.match(result.stdout, /npm run verify:lockfile/);
});
