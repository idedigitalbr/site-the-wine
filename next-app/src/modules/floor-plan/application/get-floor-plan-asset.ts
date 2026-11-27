import type { FloorPlanAssetRepository } from './ports';

export function getFloorPlanAsset(repository: FloorPlanAssetRepository, id: string) { return repository.get(id); }
