import { getFloorPlan } from '@/modules/floor-plan/application/get-floor-plan';
import { publishFloorPlan } from '@/modules/floor-plan/application/publish-floor-plan';
import { saveFloorPlanDraft } from '@/modules/floor-plan/application/save-floor-plan-draft';
import { MysqlFloorPlanRepository } from '@/modules/floor-plan/infrastructure/mysql-floor-plan-repository';
import { MysqlFloorPlanAssetRepository } from '@/modules/floor-plan/infrastructure/mysql-floor-plan-asset-repository';
import type { FloorPlanAssetRepository } from '@/modules/floor-plan/application/ports';
import { createFloorPlanAsset as createFloorPlanAssetUseCase } from '@/modules/floor-plan/application/create-floor-plan-asset';
import { getFloorPlanAsset as getFloorPlanAssetUseCase } from '@/modules/floor-plan/application/get-floor-plan-asset';

const repository = new MysqlFloorPlanRepository();
const assetRepository = new MysqlFloorPlanAssetRepository();
export const loadFloorPlan = () => getFloorPlan(repository);
export const saveFloorPlan = async (input: Parameters<typeof saveFloorPlanDraft>[1]) => {
  if (input.document.background && !(await assetRepository.exists(input.document.background.assetId))) throw new Error('INVALID_BACKGROUND_ASSET');
  return saveFloorPlanDraft(repository, input);
};
export const publishSavedFloorPlan = (input: Parameters<typeof publishFloorPlan>[1]) => publishFloorPlan(repository, input);
export const resetFloorPlanDraft = (expectedDraftRevision: number) => repository.resetDraft(expectedDraftRevision);
export const createFloorPlanAsset = (input: Parameters<FloorPlanAssetRepository['create']>[0]) => createFloorPlanAssetUseCase(assetRepository, input);
export const getFloorPlanAsset = (id: string) => getFloorPlanAssetUseCase(assetRepository, id);
