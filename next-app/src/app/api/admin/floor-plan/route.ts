import { NextResponse } from 'next/server';
import { requireAdminSession, AdminAuthError } from '@/server/admin/auth';
import { loadFloorPlan, publishSavedFloorPlan, resetFloorPlanDraft, saveFloorPlan } from '@/server/floor-plan/composition';
import { draftSaveSchema, publishSchema, resetSchema } from '@/modules/floor-plan/schemas/floor-plan-schema';

function failure(error: unknown) {
  if (error instanceof AdminAuthError) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  if (error instanceof Error && error.message === 'INVALID_BACKGROUND_ASSET') return NextResponse.json({ error: 'invalid_background_asset' }, { status: 400 });
  if (error instanceof Error && error.message === 'REVISION_CONFLICT') return NextResponse.json({ error: 'revision_conflict' }, { status: 409 });
  console.error('Admin floor plan operation failed', error); return NextResponse.json({ error: 'admin_unavailable' }, { status: 503 });
}
export async function GET() { try { await requireAdminSession(); return NextResponse.json(await loadFloorPlan(), { headers: { 'Cache-Control': 'no-store' } }); } catch (error) { return failure(error); } }
export async function PUT(request: Request) { try { await requireAdminSession(); const parsed = draftSaveSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 }); return NextResponse.json(await saveFloorPlan(parsed.data)); } catch (error) { return failure(error); } }
export async function POST(request: Request) { try { await requireAdminSession(); const parsed = publishSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: 'invalid_input', issues: parsed.error.issues }, { status: 400 }); return NextResponse.json(await publishSavedFloorPlan(parsed.data)); } catch (error) { return failure(error); } }
export async function DELETE(request: Request) { try { await requireAdminSession(); const parsed = resetSchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 }); return NextResponse.json(await resetFloorPlanDraft(parsed.data.expectedDraftRevision)); } catch (error) { return failure(error); } }
