import type { Metadata } from 'next';
import { FloorPlanEditorView } from '@/components/admin/FloorPlanEditorView';
import { loadFloorPlan } from '@/server/floor-plan/composition';

export const metadata: Metadata = { title: 'Mapa do salão | The Wine Operations' };

export default async function AdminFloorMapPage() {
  return <FloorPlanEditorView initialState={await loadFloorPlan()} />;
}
