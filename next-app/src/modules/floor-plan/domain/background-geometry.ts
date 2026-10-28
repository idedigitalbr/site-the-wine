import type { FloorPlanBackground, Point } from './model';

export const BACKGROUND_MARGIN = 200;
export const BACKGROUND_MIN_SIZE = 1;
export const BACKGROUND_MAX_SIZE = 100000;
export const BACKGROUND_INITIAL_LONGEST_SIDE = 5000;

export function initialBackground(assetId: string, name: string, naturalWidth: number, naturalHeight: number, center: Point): FloorPlanBackground {
  const longest = Math.max(naturalWidth, naturalHeight, 1); const width = BACKGROUND_INITIAL_LONGEST_SIDE * naturalWidth / longest; const height = BACKGROUND_INITIAL_LONGEST_SIDE * naturalHeight / longest;
  return { assetId, name, naturalWidth, naturalHeight, x: center.x, y: center.y, width, height, rotation: 0, keepAspectRatio: true, allowTransform: false, allowDrag: false };
}
export function backgroundBounds(background: Pick<FloorPlanBackground, 'x' | 'y' | 'width' | 'height'>) { return { x: background.x - background.width / 2, y: background.y - background.height / 2, width: background.width, height: background.height }; }
function handleDirection(handle: 'nw' | 'ne' | 'se' | 'sw' | 'e' | 'w' | 'n' | 's') { return { horizontal: handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0, vertical: handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0 }; }
function fitBackgroundAspect(width: number, height: number, delta: Point, horizontal: number, vertical: number, ratio: number) {
  if (horizontal && !vertical) return { width, height: width / ratio };
  if (vertical && !horizontal) return { width: height * ratio, height };
  if (horizontal && vertical) return Math.abs(delta.x) >= Math.abs(delta.y) * ratio ? { width, height: width / ratio } : { width: height * ratio, height };
  return { width, height };
}
function anchorCoordinate(start: number, size: number, nextSize: number, direction: number, center: number) { if (direction === 1) return start + nextSize / 2; if (direction === -1) return start + size - nextSize / 2; return center; }
function resizeAnchor(box: ReturnType<typeof backgroundBounds>, width: number, height: number, horizontal: number, vertical: number, center: FloorPlanBackground) { return { x: anchorCoordinate(box.x, box.width, width, horizontal, center.x), y: anchorCoordinate(box.y, box.height, height, vertical, center.y) }; }
export function resizeBackground(background: FloorPlanBackground, handle: 'nw' | 'ne' | 'se' | 'sw' | 'e' | 'w' | 'n' | 's', delta: Point): FloorPlanBackground {
  const box = backgroundBounds(background); const { horizontal, vertical } = handleDirection(handle); const rawWidth = horizontal ? box.width + delta.x * horizontal : box.width; const rawHeight = vertical ? box.height + delta.y * vertical : box.height; const bounded = { width: Math.max(BACKGROUND_MIN_SIZE, Math.min(BACKGROUND_MAX_SIZE, rawWidth)), height: Math.max(BACKGROUND_MIN_SIZE, Math.min(BACKGROUND_MAX_SIZE, rawHeight)) }; const sized = background.keepAspectRatio ? fitBackgroundAspect(bounded.width, bounded.height, delta, horizontal, vertical, box.width / box.height || 1) : bounded; const width = Math.max(BACKGROUND_MIN_SIZE, Math.min(BACKGROUND_MAX_SIZE, sized.width)); const height = Math.max(BACKGROUND_MIN_SIZE, Math.min(BACKGROUND_MAX_SIZE, sized.height)); const center = resizeAnchor(box, width, height, horizontal, vertical, background); return { ...background, ...center, width, height };
}
export function translateBackground(background: FloorPlanBackground, delta: Point): FloorPlanBackground { return { ...background, x: background.x + delta.x, y: background.y + delta.y }; }
export function expandDocumentAroundBackground(document: { width: number; height: number; background: FloorPlanBackground | null }, background: FloorPlanBackground) {
  const bounds = backgroundBounds(background); const shift = { x: Math.max(0, BACKGROUND_MARGIN - bounds.x), y: Math.max(0, BACKGROUND_MARGIN - bounds.y) }; const right = bounds.x + shift.x + bounds.width + BACKGROUND_MARGIN; const bottom = bounds.y + shift.y + bounds.height + BACKGROUND_MARGIN;
  return { width: Math.max(document.width + shift.x, right), height: Math.max(document.height + shift.y, bottom), shift };
}
