import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('usa o novo vídeo horizontal no banner principal', () => {
  assert.match(index, /<section id="home"[\s\S]*?<source src="assets\/S1 TOPO HERO\/video-web-horizontal\.mp4" type="video\/mp4">/);
  assert.doesNotMatch(index, /thwine-video-topo\.mp4/);
  assert.equal(fs.existsSync(path.join(root, 'assets/S1 TOPO HERO/video-web-horizontal.mp4')), true);
});
