import fs from 'node:fs';
import path from 'node:path';

const SCRIPT_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const BODY_PATTERN = /<body[^>]*>([\s\S]*?)<\/body>/i;
const RELATIVE_ASSET_ATTRIBUTE_PATTERN = /\b(src|href)=(["'])assets\//gi;
const RELATIVE_ASSET_CSS_PATTERN = /url\((["']?)assets\//gi;

function normalizeLegacyMarkup(source: string): string {
  return source
    .replace(SCRIPT_PATTERN, '')
    .replace(RELATIVE_ASSET_ATTRIBUTE_PATTERN, '$1=$2/assets/')
    .replace(RELATIVE_ASSET_CSS_PATTERN, 'url($1/assets/');
}

export function getLegacyBodyMarkup(): string {
  const legacyPath = path.join(process.cwd(), 'legacy', 'index.html');
  const source = fs.readFileSync(legacyPath, 'utf8');
  const match = source.match(BODY_PATTERN);

  if (!match) {
    throw new Error(`Não foi possível localizar <body> em ${legacyPath}`);
  }

  return normalizeLegacyMarkup(match[1]);
}

function markerBoundary(markup: string, marker: string): number {
  const markerIndex = markup.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error(`Marcador legado não encontrado: ${marker}`);
  }

  const commentStart = markup.lastIndexOf('<!--', markerIndex);
  return commentStart >= 0 ? commentStart : markerIndex;
}

export function getLegacyChunk(startMarker: string, endMarker?: string): string {
  const markup = getLegacyBodyMarkup();
  const start = markerBoundary(markup, startMarker);
  const end = endMarker ? markerBoundary(markup, endMarker) : markup.length;

  if (end <= start) {
    throw new Error(`Ordem inválida entre marcadores: ${startMarker} -> ${endMarker}`);
  }

  return markup.slice(start, end);
}
