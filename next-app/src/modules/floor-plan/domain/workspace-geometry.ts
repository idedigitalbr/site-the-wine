import type { FloorPlanDocument } from './model';
import { backgroundBounds } from './background-geometry';
import { elementAabb } from './editor-constraints';

export type WorkspaceBounds = { x: number; y: number; width: number; height: number };

export const WORKSPACE_PADDING = 100;

export function workspaceBounds(document: Pick<FloorPlanDocument, 'width' | 'height' | 'background' | 'elements'>, padding = WORKSPACE_PADDING): WorkspaceBounds {
  const boxes: Array<{ minX: number; minY: number; maxX: number; maxY: number }> = document.elements.map(elementAabb);
  if (document.background) {
    const background = backgroundBounds(document.background);
    boxes.push({ minX: background.x, minY: background.y, maxX: background.x + background.width, maxY: background.y + background.height });
  }
  if (!boxes.length) return { x: 0, y: 0, width: document.width, height: document.height };

  const minX = Math.min(...boxes.map((box) => box.minX));
  const minY = Math.min(...boxes.map((box) => box.minY));
  const maxX = Math.max(...boxes.map((box) => box.maxX));
  const maxY = Math.max(...boxes.map((box) => box.maxY));
  const safePadding = Math.max(0, padding);
  const x = Math.max(0, minX - safePadding);
  const y = Math.max(0, minY - safePadding);
  const right = Math.min(document.width, maxX + safePadding);
  const bottom = Math.min(document.height, maxY + safePadding);
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}
