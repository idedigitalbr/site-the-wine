import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export function loadCustomerReservationsModule(sourceUrl, imports = {}) {
  const source = readFileSync(sourceUrl, 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: sourceUrl.pathname,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  const restrictedRequire = (name) => {
    if (Object.hasOwn(imports, name)) return imports[name];
    throw new Error(`Import de teste não fornecido: ${name}`);
  };
  new Function('require', 'module', 'exports', compiled.outputText)(
    restrictedRequire,
    module,
    module.exports,
  );
  return module.exports;
}
