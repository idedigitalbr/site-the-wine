import assert from 'node:assert/strict';
import test from 'node:test';

test('lockfile checker reports dependency drift', async () => {
  const { findDependencyDrift } = await import('../scripts/check-lockfile-sync.mjs');
  const packageJson = {
    dependencies: { zod: '^4.0.0' },
    devDependencies: { typescript: '6.0.3' },
  };
  const lockJson = {
    packages: {
      '': {
        dependencies: {},
        devDependencies: { typescript: '6.0.3' },
      },
    },
  };

  const drift = findDependencyDrift(packageJson, lockJson);

  assert.deepEqual(
    drift,
    ['dependencies.zod expected ^4.0.0 but lockfile has <missing>'],
  );
});

test('lockfile checker accepts matching root manifests', async () => {
  const { findDependencyDrift } = await import('../scripts/check-lockfile-sync.mjs');
  const packageJson = {
    dependencies: { zod: '^4.0.0' },
    devDependencies: {},
  };
  const lockJson = {
    packages: {
      '': {
        dependencies: { zod: '^4.0.0' },
        devDependencies: {},
      },
    },
  };

  assert.deepEqual(findDependencyDrift(packageJson, lockJson), []);
});
