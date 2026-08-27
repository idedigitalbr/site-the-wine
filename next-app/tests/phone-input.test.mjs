import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = new URL('..', import.meta.url);

async function loadPhoneModule() {
  const source = readFileSync(new URL('src/lib/phone.ts', root), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    fileName: 'src/lib/phone.ts',
  });
  const encoded = Buffer.from(compiled.outputText).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

test('phone input normalizes Brazilian phone numbers for display and validation', async () => {
  const { formatPhoneInput, phoneDigits } = await loadPhoneModule();

  assert.equal(formatPhoneInput('91984040710'), '(91) 98404-0710');
  assert.equal(formatPhoneInput('+55 (91) 98404-0710'), '(91) 98404-0710');
  assert.equal(formatPhoneInput('telefone inválido'), '');
  assert.equal(phoneDigits('(91) 98404-0710'), '91984040710');
});
