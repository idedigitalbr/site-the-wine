import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const globals = readFileSync(
  new URL('../src/app/globals.css', import.meta.url),
  'utf8',
);
const tokens = readFileSync(
  new URL('../src/styles/reservation-tokens.css', import.meta.url),
  'utf8',
);

test('globals imports reservation tokens without moving legacy styles into the module', () => {
  assert.match(globals, /@import ['"]\.\.\/styles\/reservation-tokens\.css['"]/);
  assert.doesNotMatch(globals, /\.reservation-theme\s*\{/);
  assert.doesNotMatch(globals, /\.reservation-admin-theme\s*\{/);
});

test('reservation public tokens are scoped and preserve The Wine identity', () => {
  assert.match(tokens, /\.reservation-theme\s*\{/);
  assert.match(tokens, /--background:\s*#000000/);
  assert.match(tokens, /--primary:\s*#D3B97B/);
  assert.match(tokens, /--foreground:\s*#FFFFFF/);
  assert.match(tokens, /--surface:\s*#0B0A08/);
});

test('admin tokens use an operational light surface without changing the home', () => {
  assert.match(tokens, /\.reservation-admin-theme\s*\{/);
  assert.match(tokens, /--background:\s*#F7F5F0/);
  assert.match(tokens, /--sidebar:\s*#0B0A08/);
  assert.doesNotMatch(tokens, /body\s*\{[^}]*#F7F5F0/s);
});

test('table and reservation state tokens are semantic', () => {
  for (const token of [
    '--table-available',
    '--table-selected',
    '--table-unavailable',
    '--table-reserved',
    '--table-occupied',
    '--table-blocked',
    '--status-success',
    '--status-warning',
    '--status-danger',
  ]) {
    assert.equal(tokens.includes(token), true, `missing ${token}`);
  }
});
