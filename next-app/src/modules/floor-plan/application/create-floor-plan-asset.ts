import type { FloorPlanAssetRepository, FloorPlanAssetInput } from './ports';

export function createFloorPlanAsset(repository: FloorPlanAssetRepository, input: FloorPlanAssetInput) { return repository.create(input); }
