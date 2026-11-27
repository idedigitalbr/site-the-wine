import type { FloorPlanDocument } from '../domain/model';

export type FloorPlanState = { draft: FloorPlanDocument; published: FloorPlanDocument | null; draftRevision: number; publishedRevision: number; inventoryFingerprint: string; basePublishedRevision: number };
export interface FloorPlanRepository {
  getState(): Promise<FloorPlanState>;
  saveDraft(input: { document: FloorPlanDocument; expectedDraftRevision: number; basePublishedRevision: number; inventoryFingerprint: string }): Promise<FloorPlanState>;
  publish(input: { expectedDraftRevision: number; expectedPublishedRevision: number; inventoryFingerprint: string }): Promise<FloorPlanState>;
  resetDraft(expectedDraftRevision: number): Promise<FloorPlanState>;
}

export type FloorPlanAssetInput = { filename: string; mimeType: string; bytes: Buffer };
export type FloorPlanAsset = { id: string; filename: string; mimeType: string; byteSize: number; bytes: Buffer };
export interface FloorPlanAssetRepository {
  create(input: FloorPlanAssetInput): Promise<Pick<FloorPlanAsset, 'id' | 'filename' | 'mimeType' | 'byteSize'>>;
  get(id: string): Promise<FloorPlanAsset | null>;
  exists(id: string): Promise<boolean>;
}
