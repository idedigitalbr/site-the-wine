import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const footer = fs.readFileSync(path.join(root, 'src/components/layout/Footer.tsx'), 'utf8');

test('footer embeds the real Google Maps location', () => {
  assert.match(footer, /<iframe/);
  assert.match(footer, /google\.com\/maps\?q=/);
  assert.match(footer, /Alcindo\+Cacela\+1848/);
  assert.match(footer, /Nazar%C3%A9\+Bel%C3%A9m/);
  assert.match(footer, /title="Mapa da localização do The Wine Experience/);
});
