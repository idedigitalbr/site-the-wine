import type { FloorPlanRepository } from './ports';
export const publishFloorPlan = (repository: FloorPlanRepository, input: { expectedDraftRevision: number; expectedPublishedRevision: number; inventoryFingerprint: string }) => repository.publish(input);
