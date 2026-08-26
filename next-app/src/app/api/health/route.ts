import { NextResponse } from 'next/server';
import { pingDatabase } from '@/server/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await pingDatabase();
    return NextResponse.json({
      status: 'ok',
      service: 'thewine-web',
      database: 'ok',
    });
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        service: 'thewine-web',
        database: 'unavailable',
      },
      { status: 503 },
    );
  }
}
