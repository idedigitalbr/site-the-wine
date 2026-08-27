import { NextRequest, NextResponse } from 'next/server';
import { adminCustomerQuerySchema } from '@/modules/admin/schemas/admin-schema';
import { loadAdminCustomers } from '@/server/admin/composition';
import { AdminAuthError, requireAdminSession } from '@/server/admin/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const search = adminCustomerQuerySchema.parse({
      search: request.nextUrl.searchParams.get('search') ?? undefined,
    }).search;
    return NextResponse.json({ customers: await loadAdminCustomers(search) });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (error instanceof Error && error.name === 'ZodError') return NextResponse.json({ error: 'invalid_search' }, { status: 400 });
    console.error('Admin customers failed', error);
    return NextResponse.json({ error: 'customers_unavailable' }, { status: 503 });
  }
}
