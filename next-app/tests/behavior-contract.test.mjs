import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('parallax keeps the legacy breakpoint and interpolation', () => {
  const source = read('src/behaviors/parallax.ts');
  assert.match(source, /innerWidth <= 768/);
  assert.match(source, /0\.08/);
  assert.match(source, /translate3d\(calc\(-50%/);
  assert.match(source, /translate3d\(0,/);
});

test('scroll spy keeps the legacy 160px offset', () => {
  const source = read('src/behaviors/scrollSpy.ts');
  assert.match(source, /scrollY \+ 160/);
});

test('reveal keeps the legacy observer contract', () => {
  const source = read('src/behaviors/reveal.ts');
  assert.match(source, /threshold: 0\.05/);
  assert.match(source, /0px 0px -40px 0px/);
  assert.match(source, /unobserve/);
});

test('events accordion keeps the mobile breakpoint and centering behavior', () => {
  const source = read('src/behaviors/eventsAccordion.ts');
  assert.match(source, /max-width: 860px/);
  assert.match(source, /block: 'center'/);
  assert.match(source, /requestAnimationFrame/);
});

test('gallery keeps legacy speeds, resume delay and reduced motion', () => {
  const source = read('src/behaviors/galleryLightbox.ts');
  assert.match(source, /autoSpeed = 0\.5/);
  assert.match(source, /autoSpeed = 0\.25/);
  assert.match(source, /delay = 3000/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /for \(let set = 0; set < 2;/);
});
