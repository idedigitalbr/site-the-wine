import type { FloorPlanDocument } from '../domain/model';
import type { FloorPlanRepository } from './ports';
export const saveFloorPlanDraft = (repository: FloorPlanRepository, input: { document: FloorPlanDocument; expectedDraftRevision: number; basePublishedRevision: number; inventoryFingerprint: string }) => repository.saveDraft(input);
