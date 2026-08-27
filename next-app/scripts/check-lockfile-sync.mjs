import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
];

function sectionDrift(packageSection = {}, lockSection = {}, sectionName) {
  const names = new Set([
    ...Object.keys(packageSection),
    ...Object.keys(lockSection),
  ]);

  return [...names].flatMap((name) => {
    const expected = packageSection[name];
    const actual = lockSection[name];
    if (expected === actual) return [];

    return [
      `${sectionName}.${name} expected ${expected ?? '<missing>'} `
      + `but lockfile has ${actual ?? '<missing>'}`,
    ];
  });
}

export function findDependencyDrift(packageJson, lockJson) {
  const lockRoot = lockJson.packages?.[''] ?? {};
  return SECTIONS.flatMap((section) => (
    sectionDrift(packageJson[section], lockRoot[section], section)
  ));
}

function runCli() {
  const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  const lockJson = JSON.parse(readFileSync(resolve('package-lock.json'), 'utf8'));
  const drift = findDependencyDrift(packageJson, lockJson);

  if (drift.length === 0) {
    console.log('Package manifest and lockfile root are synchronized.');
    return;
  }

  for (const item of drift) console.error(item);
  process.exitCode = 1;
}

const isMain = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) runCli();
