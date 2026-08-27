import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

function createFile(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return path;
}

test('domain rule rejects React, Next and database imports', async () => {
  const { analyzeFile, rules } = await import('../scripts/check-architecture.mjs');
  const root = mkdtempSync(join(tmpdir(), 'wine-arch-'));
  const file = createFile(
    root,
    'src/modules/reservations/domain/reservation.ts',
    "import React from 'react';\nimport mysql from 'mysql2';\n",
  );

  const violations = analyzeFile(file, rules.domain);

  assert.deepEqual(
    violations.map((item) => item.specifier).sort(),
    ['mysql2', 'react'],
  );
});

test('ui rule rejects direct database and infrastructure imports', async () => {
  const { analyzeFile, rules } = await import('../scripts/check-architecture.mjs');
  const root = mkdtempSync(join(tmpdir(), 'wine-arch-'));
  const file = createFile(
    root,
    'src/components/reservation/v2/Form.tsx',
    "import { db } from '@/server/db';\n"
      + "import { repo } from '@/modules/reservations/infrastructure/repository';\n",
  );

  const violations = analyzeFile(file, rules.ui);

  assert.equal(violations.length, 2);
});
