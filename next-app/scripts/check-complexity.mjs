import { createRequire } from 'node:module';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

export const MAX_COMPLEXITY = 8;
export const MAX_DEPTH = 3;

function isSourceFile(path) {
  const extension = extname(path);
  return (extension === '.ts' || extension === '.tsx') && !path.endsWith('.d.ts');
}

function collectSourceFiles(directory) {
  if (!statSync(directory).isDirectory()) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return isSourceFile(path) ? [path] : [];
  });
}

function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isConstructorDeclaration(node);
}

function isLogicalDecision(node) {
  if (!ts.isBinaryExpression(node)) return false;
  const token = node.operatorToken.kind;
  return token === ts.SyntaxKind.AmpersandAmpersandToken
    || token === ts.SyntaxKind.BarBarToken
    || token === ts.SyntaxKind.QuestionQuestionToken;
}

function isDecisionNode(node) {
  return ts.isIfStatement(node)
    || ts.isForStatement(node)
    || ts.isForInStatement(node)
    || ts.isForOfStatement(node)
    || ts.isWhileStatement(node)
    || ts.isDoStatement(node)
    || ts.isCatchClause(node)
    || ts.isConditionalExpression(node)
    || ts.isCaseClause(node)
    || isLogicalDecision(node);
}

function increasesDepth(node) {
  return ts.isIfStatement(node)
    || ts.isForStatement(node)
    || ts.isForInStatement(node)
    || ts.isForOfStatement(node)
    || ts.isWhileStatement(node)
    || ts.isDoStatement(node)
    || ts.isCatchClause(node)
    || ts.isConditionalExpression(node)
    || ts.isSwitchStatement(node);
}

function functionName(node) {
  if (node.name?.getText) return node.name.getText();
  if (ts.isVariableDeclaration(node.parent) && node.parent.name) {
    return node.parent.name.getText();
  }
  if (ts.isPropertyAssignment(node.parent)) return node.parent.name.getText();
  return '<anonymous>';
}

function functionPosition(sourceFile, node) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return { line: position.line + 1, column: position.character + 1 };
}

function measureFunction(node) {
  const metrics = { complexity: 1, maxDepth: 0 };

  function visit(current, depth) {
    if (current !== node && isFunctionLike(current)) return;
    if (isDecisionNode(current)) metrics.complexity += 1;

    const nextDepth = increasesDepth(current) ? depth + 1 : depth;
    metrics.maxDepth = Math.max(metrics.maxDepth, nextDepth);
    ts.forEachChild(current, (child) => visit(child, nextDepth));
  }

  if (node.body) visit(node.body, 0);
  return metrics;
}

function violationsForFunction(sourceFile, fileName, node) {
  const metrics = measureFunction(node);
  const position = functionPosition(sourceFile, node);
  const base = { file: fileName, functionName: functionName(node), ...position };
  const violations = [];

  if (metrics.complexity > MAX_COMPLEXITY) {
    violations.push({
      ...base,
      kind: 'complexity',
      value: metrics.complexity,
      max: MAX_COMPLEXITY,
    });
  }
  if (metrics.maxDepth > MAX_DEPTH) {
    violations.push({
      ...base,
      kind: 'depth',
      value: metrics.maxDepth,
      max: MAX_DEPTH,
    });
  }

  return violations;
}

export function analyzeSourceText(sourceText, fileName = 'source.ts') {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  const violations = [];

  function visit(node) {
    if (isFunctionLike(node)) {
      violations.push(...violationsForFunction(sourceFile, fileName, node));
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function analyzeDirectory(directory) {
  const root = resolve(directory);
  return collectSourceFiles(root).flatMap((file) => {
    const source = readFileSync(file, 'utf8');
    return analyzeSourceText(source, relative(process.cwd(), file));
  });
}

function printViolations(violations) {
  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line}:${violation.column} `
      + `${violation.functionName} ${violation.kind}=${violation.value} `
      + `(max ${violation.max})`,
    );
  }
}

function runCli() {
  const target = resolve(process.cwd(), process.argv[2] ?? 'src');
  const violations = analyzeDirectory(target);

  if (violations.length === 0) {
    console.log(
      `Complexity guard passed: cyclomatic <= ${MAX_COMPLEXITY}, `
      + `depth <= ${MAX_DEPTH}.`,
    );
    return;
  }

  printViolations(violations);
  process.exitCode = 1;
}

const isMain = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) runCli();
