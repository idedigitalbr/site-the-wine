import { createRequire } from 'node:module';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export const rules = {
  domain: {
    targets: ['src/modules'],
    pathFragment: '/domain/',
    bannedPrefixes: [
      'react',
      'next',
      'mysql2',
      '@/server',
      '@/app',
      '@/components',
    ],
    bannedFragments: [],
  },
  ui: {
    targets: [
      'src/components/ui',
      'src/components/admin',
      'src/components/reservation/v2',
      'src/components/reservation/portal',
      'src/components/account/reservations-list',
      'src/app/reservas',
      'src/app/minha-reserva',
      'src/app/admin',
      'src/app/lista-de-reservas',
    ],
    bannedPrefixes: ['mysql2', '@/server/db'],
    bannedFragments: ['/infrastructure/'],
  },
  routes: {
    targets: [
      'src/app/api/reservations',
      'src/app/api/admin',
      'src/app/api/internal',
      'src/app/api/payments',
      'src/app/api/webhooks',
    ],
    bannedPrefixes: ['mysql2', '@/server/db'],
    bannedFragments: ['/infrastructure/'],
  },
};

function isSourceFile(path) {
  const extension = extname(path);
  return (extension === '.ts' || extension === '.tsx') && !path.endsWith('.d.ts');
}

function collectSourceFiles(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return isSourceFile(path) ? [path] : [];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(child);
    return isSourceFile(child) ? [child] : [];
  });
}

function importSpecifiers(sourceText, fileName) {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  const specifiers = [];

  function visit(node) {
    const isModuleDeclaration = ts.isImportDeclaration(node)
      || ts.isExportDeclaration(node);
    if (
      isModuleDeclaration
      && node.moduleSpecifier
      && ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    }

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [argument] = node.arguments;
      if (argument && ts.isStringLiteral(argument)) specifiers.push(argument.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function startsWithBannedPrefix(specifier, prefixes) {
  return prefixes.some(
    (prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`),
  );
}

function containsBannedFragment(specifier, fragments) {
  return fragments.some((fragment) => specifier.includes(fragment));
}

function isBanned(specifier, rule) {
  return startsWithBannedPrefix(specifier, rule.bannedPrefixes)
    || containsBannedFragment(specifier, rule.bannedFragments);
}

export function analyzeFile(filePath, rule) {
  const source = readFileSync(filePath, 'utf8');
  return importSpecifiers(source, filePath)
    .filter((specifier) => isBanned(specifier, rule))
    .map((specifier) => ({ file: filePath, specifier }));
}

function matchesRulePath(filePath, rule) {
  if (!rule.pathFragment) return true;
  return filePath.replaceAll('\\', '/').includes(rule.pathFragment);
}

export function analyzeRule(rule) {
  return rule.targets
    .flatMap((target) => collectSourceFiles(resolve(target)))
    .filter((file) => matchesRulePath(file, rule))
    .flatMap((file) => analyzeFile(file, rule));
}

export function analyzeArchitecture() {
  return Object.entries(rules).flatMap(([ruleName, rule]) => (
    analyzeRule(rule).map((violation) => ({ ...violation, rule: ruleName }))
  ));
}

function printViolations(violations) {
  for (const violation of violations) {
    console.error(
      `${relative(process.cwd(), violation.file)}: `
      + `${violation.rule} cannot import ${violation.specifier}`,
    );
  }
}

function runCli() {
  const violations = analyzeArchitecture();

  if (violations.length === 0) {
    console.log('Architecture guard passed.');
    return;
  }

  printViolations(violations);
  process.exitCode = 1;
}

const isMain = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) runCli();
