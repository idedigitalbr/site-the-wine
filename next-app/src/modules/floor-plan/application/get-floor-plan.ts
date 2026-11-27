import type { FloorPlanRepository } from './ports';
export const getFloorPlan = (repository: FloorPlanRepository) => repository.getState();
