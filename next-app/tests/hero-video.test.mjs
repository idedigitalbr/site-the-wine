import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('hero video requests eager loading for the local background', () => {
  const source = read('src/components/sections/HeroSection.tsx');
  assert.match(source, /<video[^>]*preload="auto"/s);
});

test('hero loop retries playback when media becomes ready or the page becomes visible', () => {
  const source = read('src/behaviors/heroLoop.ts');
  assert.match(source, /addEventListener\(['"]canplay['"]/);
  assert.match(source, /addEventListener\(['"]visibilitychange['"]/);
  assert.match(source, /heroVideo\.play\(\)\.catch/);
});
