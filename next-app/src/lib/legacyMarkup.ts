import fs from 'node:fs';
import path from 'node:path';

const SCRIPT_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const BODY_PATTERN = /<body[^>]*>([\s\S]*?)<\/body>/i;
const RELATIVE_ASSET_ATTRIBUTE_PATTERN = /\b(src|href)=(["'])assets\//gi;
const RELATIVE_ASSET_CSS_PATTERN = /url\((["']?)assets\//gi;

export function getLegacyBodyMarkup(): string {
  const legacyPath = path.join(process.cwd(), 'legacy', 'index.html');
  const source = fs.readFileSync(legacyPath, 'utf8');
  const match = source.match(BODY_PATTERN);

  if (!match) {
    throw new Error(`Não foi possível localizar <body> em ${legacyPath}`);
  }

  return match[1]
    .replace(SCRIPT_PATTERN, '')
    .replace(RELATIVE_ASSET_ATTRIBUTE_PATTERN, '$1=$2/assets/')
    .replace(RELATIVE_ASSET_CSS_PATTERN, 'url($1/assets/');
}
