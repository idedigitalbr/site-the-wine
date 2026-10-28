import { z } from 'zod';
import { normalizeFloorPlanDocument } from '../domain/normalize-document';

const editorSettingsSchema = z.object({ snapToGrid: z.boolean().optional(), showGrid: z.boolean().optional(), zoomOnScroll: z.boolean().optional(), zoomOnPinch: z.boolean().optional(), keepObjectsInBounds: z.boolean().optional() }).optional();
const backgroundSchema = z.object({ assetId: z.string().regex(/^\d+$/), name: z.string().min(1).max(160), naturalWidth: z.number().int().positive().max(16384), naturalHeight: z.number().int().positive().max(16384), x: z.number().finite(), y: z.number().finite(), width: z.number().finite().min(1).max(100000), height: z.number().finite().min(1).max(100000), rotation: z.number().finite().optional(), keepAspectRatio: z.boolean(), allowTransform: z.boolean().optional(), allowDrag: z.boolean().optional() });
const rawDocumentSchema = z.object({ schemaVersion: z.number().optional(), width: z.number().finite().min(100).max(200000), height: z.number().finite().min(100).max(200000), grid: z.number().finite().min(1).max(100), elements: z.array(z.unknown()).max(700), joinLinks: z.array(z.object({ tableIds: z.array(z.string()).length(2) })).max(244650).optional(), background: backgroundSchema.nullable().optional(), editorSettings: editorSettingsSchema });
export const floorPlanDocumentSchema = rawDocumentSchema.transform((value) => normalizeFloorPlanDocument(value));
export const draftSaveSchema = z.object({ expectedDraftRevision: z.number().int().nonnegative(), basePublishedRevision: z.number().int().nonnegative(), inventoryFingerprint: z.string().length(64), document: floorPlanDocumentSchema });
export const publishSchema = z.object({ expectedDraftRevision: z.number().int().nonnegative(), expectedPublishedRevision: z.number().int().nonnegative(), inventoryFingerprint: z.string().length(64) });
export const resetSchema = z.object({ expectedDraftRevision: z.number().int().nonnegative() });
