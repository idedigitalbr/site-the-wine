import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/components/reservation/v2/WaitlistForm.tsx', import.meta.url), 'utf8');

test('waitlist does not render a submit path with an invalid guest count', () => {
  assert.match(source, /Number\.isInteger\(guests\)/);
  assert.match(source, /guests < 1/);
  assert.match(source, /Selecione primeiro a quantidade de pessoas/);
});
