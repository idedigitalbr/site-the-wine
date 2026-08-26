import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('menu controller loads only the PageFlip library and initializes TypeScript behavior', () => {
  const source = read('src/components/menu/MenuFlipbookController.tsx');
  assert.match(source, /page-flip\.browser\.js/);
  assert.match(source, /setupMenuFlipbook/);
  assert.equal(source.includes('menu-flipbook.js'), false);
});

test('TypeScript flipbook behavior preserves critical legacy settings', () => {
  const source = read('src/behaviors/menuFlipbook.ts');
  for (const contract of [
    'width: 595',
    'height: 842',
    'maxShadowOpacity: 0.48',
    'flippingTime: 720',
    'max-width: 820px',
    '560',
    '0.18',
    '1.35',
    'menuModalScrollY',
    'pausedBackgroundVideos',
    'requestFullscreen',
    'ArrowRight',
    'ArrowLeft',
    "event.key === 'Home'",
    "event.key === 'End'",
  ]) {
    assert.equal(source.includes(contract), true, `missing contract ${contract}`);
  }
});

test('flipbook behavior exposes lifecycle cleanup', () => {
  const source = read('src/behaviors/menuFlipbook.ts');
  assert.match(source, /export function setupMenuFlipbook/);
  assert.match(source, /return \(\) =>/);
  assert.match(source, /removeEventListener/);
  assert.match(source, /pageFlip\?\.destroy/);
});
