import type { Metadata } from 'next';
import { AdminFloorMapView } from '@/components/admin/AdminFloorMapView';
import { loadAdminConfiguration, loadFloorMap } from '@/server/admin/composition';

export const metadata: Metadata = { title: 'Mapa do salão | The Wine Operations' };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminFloorMapPage() {
  const date = todayIso();
  const [map, configuration] = await Promise.all([loadFloorMap(date, '19:00'), loadAdminConfiguration()]);
  return <AdminFloorMapView initialMap={map} areas={configuration.areas} />;
}
