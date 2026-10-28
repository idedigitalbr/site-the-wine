import { NextResponse } from 'next/server';
import { getFloorPlanAsset } from '@/server/floor-plan/composition';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = (await context.params).id;
  if (!/^\d+$/.test(id) || Number(id) < 1) return new NextResponse('Not found', { status: 404 });
  try {
    const asset = await getFloorPlanAsset(id);
    if (!asset) return new NextResponse('Not found', { status: 404 });
    return new NextResponse(new Uint8Array(asset.bytes), { headers: { 'Content-Type': asset.mimeType, 'Content-Length': String(asset.byteSize), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Security-Policy': "default-src 'none'; img-src 'self'" } });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
