import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getDatabasePool } from '@/server/db';
import type { FloorPlanAsset, FloorPlanAssetInput, FloorPlanAssetRepository } from '../application/ports';

type AssetRow = RowDataPacket & { id: string; filename: string; mime_type: string; byte_size: number; content: Buffer };

export class MysqlFloorPlanAssetRepository implements FloorPlanAssetRepository {
  async create(input: FloorPlanAssetInput) {
    const [result] = await getDatabasePool().execute<ResultSetHeader>('INSERT INTO floor_plan_assets (filename,mime_type,byte_size,blob_data) VALUES (?,?,?,?)', [input.filename, input.mimeType, input.bytes.length, input.bytes]);
    return { id: String(result.insertId), filename: input.filename, mimeType: input.mimeType, byteSize: input.bytes.length };
  }

  async get(id: string): Promise<FloorPlanAsset | null> {
    const [rows] = await getDatabasePool().execute<AssetRow[]>('SELECT id,filename,mime_type,byte_size,blob_data AS content FROM floor_plan_assets WHERE id=? LIMIT 1', [id]);
    const row = rows[0];
    return row ? { id: row.id, filename: row.filename, mimeType: row.mime_type, byteSize: Number(row.byte_size), bytes: Buffer.from(row.content) } : null;
  }

  async exists(id: string) {
    const [rows] = await getDatabasePool().execute<RowDataPacket[]>('SELECT id FROM floor_plan_assets WHERE id=? LIMIT 1', [id]);
    return rows.length > 0;
  }
}
