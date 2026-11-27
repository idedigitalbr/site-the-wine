import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';
import { createFloorPlanAsset } from '@/server/floor-plan/composition';

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 5 * 1024 * 1024;

function validMagic(mimeType: string, bytes: Buffer) {
  if (mimeType === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/jpeg') return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

function isValidUpload(file: FormDataEntryValue | null): file is File { return file instanceof File && file.size > 0 && file.size <= maxBytes && allowedTypes.has(file.type); }
async function storeUpload(file: File) { const bytes = Buffer.from(await file.arrayBuffer()); if (!validMagic(file.type, bytes)) return null; return createFloorPlanAsset({ filename: file.name.slice(0, 180) || 'planta', mimeType: file.type, bytes }); }

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const file = (await request.formData()).get('file');
    if (!isValidUpload(file)) return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
    const asset = await storeUpload(file);
    if (!asset) return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
    return NextResponse.json({ id: asset.id, url: `/api/floor-plan-assets/${encodeURIComponent(asset.id)}` }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'upload_failed' }, { status: 503 });
  }
}
