import { createHash } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { getDatabasePool } from '@/server/db';
import type { FloorPlanDocument, TableElement } from '../domain/model';
import { normalizeFloorPlanDocument } from '../domain/normalize-document';
import type { FloorPlanRepository, FloorPlanState } from '../application/ports';

type DocumentRow = RowDataPacket & { draft_json: string | null; draft_revision: number; published_json: string | null; published_revision: number; inventory_fingerprint: string | null };
type InventoryRow = RowDataPacket & { tableId: number; tableCode: string; tableName: string; areaId: number; capacityMin: number; capacityMax: number; shape: string; positionX: number; positionY: number; width: number; height: number; rotation: number; joinable: number; active: number };

function parseDocument(value: unknown): FloorPlanDocument | null { if (!value) return null; try { return normalizeFloorPlanDocument(typeof value === 'string' ? JSON.parse(value) : value); } catch { return null; } }
function inventoryTuple(row: InventoryRow) { return [row.tableId, row.areaId, row.capacityMin, row.capacityMax, row.shape, row.positionX, row.positionY, row.width, row.height, row.rotation, row.joinable, row.active]; }
function fingerprint(rows: InventoryRow[]): string { const tuples = rows.map(inventoryTuple); return createHash('sha256').update(JSON.stringify(tuples)).digest('hex'); }
function shapeName(shape: string): TableElement['shape'] { if (shape === 'redonda') return 'round'; if (shape === 'quadrada') return 'square'; if (shape === 'balcao') return 'bar'; return 'rectangle'; }
function rowToTable(row: InventoryRow): TableElement { return { id: `table-${row.tableId}`, kind: 'table', label: row.tableName || row.tableCode, realTableId: row.tableId, areaId: row.areaId, x: Number(row.positionX) * 12 || 120, y: Number(row.positionY) * 9 || 120, width: Number(row.width) || 80, height: Number(row.height) || 80, rotation: Number(row.rotation) || 0, shape: shapeName(row.shape), capacityMin: row.capacityMin, capacityMax: row.capacityMax, reservable: Boolean(row.active), allowJoin: Boolean(row.joinable), keepAspectRatio: true }; }
function toDocument(rows: InventoryRow[]): FloorPlanDocument {
  const document: FloorPlanDocument = { schemaVersion: 1, width: 1200, height: 900, grid: 20, elements: [], joinLinks: [], background: null };
  rows.forEach((row) => document.elements.push(rowToTable(row)));
  return document;
}
function stateFromRow(row: DocumentRow, fallback: FloorPlanDocument, inventoryFingerprint: string): FloorPlanState {
  const published = parseDocument(row.published_json); const draft = parseDocument(row.draft_json) ?? published ?? fallback;
  return { draft, published, draftRevision: Number(row.draft_revision), publishedRevision: Number(row.published_revision), inventoryFingerprint, basePublishedRevision: Number(row.published_revision) };
}
async function persistTables(connection: PoolConnection, document: FloorPlanDocument) { for (const element of document.elements) { if (!element.realTableId) continue; await connection.execute('UPDATE restaurant_tables SET position_x=?,position_y=?,width=?,height=?,rotation=?,joinable=?,active=? WHERE id=?', [element.x / document.width * 100, element.y / document.height * 100, element.width, element.height, element.rotation, element.allowJoin ? 1 : 0, element.reservable ? 1 : 0, element.realTableId]); } }

export class MysqlFloorPlanRepository implements FloorPlanRepository {
  async getState(): Promise<FloorPlanState> {
    const pool = getDatabasePool();
    const [rows] = await pool.query<InventoryRow[]>(`SELECT t.id AS tableId,t.code AS tableCode,t.name AS tableName,t.area_id AS areaId,t.capacity_min AS capacityMin,t.capacity_max AS capacityMax,t.shape,t.position_x AS positionX,t.position_y AS positionY,t.width,t.height,t.rotation,t.joinable,t.active FROM restaurant_tables t JOIN dining_areas a ON a.id=t.area_id ORDER BY t.id`);
    const [documents] = await pool.query<DocumentRow[]>('SELECT draft_json,draft_revision,published_json,published_revision,inventory_fingerprint FROM floor_plan_documents WHERE id=1');
    const row = documents[0] ?? { draft_json: null, draft_revision: 0, published_json: null, published_revision: 0, inventory_fingerprint: null } as DocumentRow;
    const currentFingerprint = fingerprint(rows); const fallback = toDocument(rows);
    const state = stateFromRow(row, fallback, currentFingerprint);
    if (!row.draft_json && !row.published_json) state.draft = fallback;
    return state;
  }

  async saveDraft(input: { document: FloorPlanDocument; expectedDraftRevision: number; basePublishedRevision: number; inventoryFingerprint: string }): Promise<FloorPlanState> {
    const connection = await getDatabasePool().getConnection();
    try { await connection.beginTransaction(); const [result] = await connection.execute<ResultSetHeader>(`UPDATE floor_plan_documents SET draft_json=?,draft_revision=draft_revision+1,inventory_fingerprint=? WHERE id=1 AND draft_revision=? AND published_revision=?`, [JSON.stringify(input.document), input.inventoryFingerprint, input.expectedDraftRevision, input.basePublishedRevision]); if (!result.affectedRows) throw new Error('REVISION_CONFLICT'); await connection.commit(); return this.getState(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async publish(input: { expectedDraftRevision: number; expectedPublishedRevision: number; inventoryFingerprint: string }): Promise<FloorPlanState> {
    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<DocumentRow[]>('SELECT draft_json,draft_revision,published_json,published_revision,inventory_fingerprint FROM floor_plan_documents WHERE id=1 FOR UPDATE');
      const row = rows[0]; if (!row || row.draft_revision !== input.expectedDraftRevision || row.published_revision !== input.expectedPublishedRevision || row.inventory_fingerprint !== input.inventoryFingerprint) throw new Error('REVISION_CONFLICT');
      const document = parseDocument(row.draft_json); if (!document) throw new Error('NO_DRAFT');
      await persistTables(connection, document);
      const nextRevision = Number(row.published_revision) + 1;
      await connection.execute('UPDATE floor_plan_documents SET published_json=?,published_revision=?,draft_revision=draft_revision+1 WHERE id=1', [JSON.stringify(document), nextRevision]);
      await connection.execute('INSERT INTO floor_plan_publications (document_id,revision,document_json,graph_json) VALUES (1,?,?,?)', [nextRevision, JSON.stringify(document), JSON.stringify({ schemaVersion: 1, edges: document.joinLinks.map((link) => ({ tableIds: link.tableIds })) })]);
      await connection.commit(); return this.getState();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }

  async resetDraft(expectedDraftRevision: number): Promise<FloorPlanState> {
    const connection = await getDatabasePool().getConnection();
    try { await connection.beginTransaction(); const [result] = await connection.execute<ResultSetHeader>(`UPDATE floor_plan_documents SET draft_json=published_json,draft_revision=draft_revision+1 WHERE id=1 AND draft_revision=?`, [expectedDraftRevision]); if (!result.affectedRows) throw new Error('REVISION_CONFLICT'); await connection.commit(); return this.getState(); } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
}
