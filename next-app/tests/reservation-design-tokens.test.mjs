import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const globals = readFileSync(
  new URL('../src/app/globals.css', import.meta.url),
  'utf8',
);

test('reservation public tokens are scoped and preserve The Wine identity', () => {
  assert.match(globals, /\.reservation-theme\s*\{/);
  assert.match(globals, /--background:\s*#000000/);
  assert.match(globals, /--primary:\s*#D3B97B/);
  assert.match(globals, /--foreground:\s*#FFFFFF/);
  assert.match(globals, /--surface:\s*#0B0A08/);
});

test('admin tokens use an operational light surface without changing the home', () => {
  assert.match(globals, /\.reservation-admin-theme\s*\{/);
  assert.match(globals, /--background:\s*#F7F5F0/);
  assert.match(globals, /--sidebar:\s*#0B0A08/);
  assert.doesNotMatch(globals, /body\s*\{[^}]*#F7F5F0/s);
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
    assert.equal(globals.includes(token), true, `missing ${token}`);
  }
});
