import type { FloorPlanDocument, JoinLink, TableElement } from './model';

export function canonicalTableIds(first: string, second: string): [string, string] | null {
  if (!first || !second || first === second) return null;
  return first < second ? [first, second] : [second, first];
}
function idsFromValue(value: unknown): [string, string] | null {
  if (!value || typeof value !== 'object') return null;
  const ids = (value as { tableIds?: unknown }).tableIds;
  if (!Array.isArray(ids) || ids.length !== 2) return null;
  if (typeof ids[0] !== 'string' || typeof ids[1] !== 'string') return null;
  return [ids[0], ids[1]];
}
function eligibleTables(first: TableElement, second: TableElement) { return first.reservable && second.reservable && first.allowJoin && second.allowJoin; }
function pairFromValue(value: unknown, tables: Map<string, TableElement>): JoinLink | null {
  const ids = idsFromValue(value);
  if (!ids) return null;
  const first = tables.get(ids[0]);
  const second = tables.get(ids[1]);
  if (!first || !second || !eligibleTables(first, second)) return null;
  const pair = canonicalTableIds(first.id, second.id);
  return pair ? { tableIds: pair } : null;
}
export function normalizeJoinLinks(raw: unknown, document: Pick<FloorPlanDocument, 'elements'>): JoinLink[] {
  const tables = new Map(document.elements.filter((element): element is TableElement => element.kind === 'table').map((table) => [table.id, table]));
  if (!Array.isArray(raw)) return [];
  const links = raw.map((value) => pairFromValue(value, tables)).filter((link): link is JoinLink => Boolean(link));
  return [...new Map(links.map((link) => [link.tableIds.join('|'), link])).values()].sort((a, b) => a.tableIds.join('|').localeCompare(b.tableIds.join('|')));
}
export function hasJoinLink(links: JoinLink[], first: string, second: string) { const pair = canonicalTableIds(first, second); return Boolean(pair && links.some((link) => link.tableIds[0] === pair[0] && link.tableIds[1] === pair[1])); }
export function toggleJoinLink(document: FloorPlanDocument, first: string, second: string, enabled: boolean): JoinLink[] {
  const pair = canonicalTableIds(first, second); if (!pair) return document.joinLinks;
  const next = document.joinLinks.filter((link) => link.tableIds[0] !== pair[0] || link.tableIds[1] !== pair[1]);
  return enabled ? normalizeJoinLinks([...next, { tableIds: pair }], document) : next;
}
export function removeLinksForTable(links: JoinLink[], tableId: string) { return links.filter((link) => !link.tableIds.includes(tableId)); }
export function linksForTable(links: JoinLink[], tableId: string) { return links.filter((link) => link.tableIds.includes(tableId)); }
