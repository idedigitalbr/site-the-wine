import type { FloorElement, Point, TableElement } from './model';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export function clampDimension(value: number) { return Math.max(1, Math.min(10000, Number.isFinite(value) ? value : 1)); }
export function snap(value: number, grid: number) { return Math.round(value / grid) * grid; }
function handleAxis(handle: ResizeHandle) { return { horizontal: handle.includes('e') ? 1 : handle.includes('w') ? -1 : 0, vertical: handle.includes('s') ? 1 : handle.includes('n') ? -1 : 0 }; }
function aspectSize(element: TableElement, width: number, height: number, horizontal: number, keepAspect: boolean) { if (!keepAspect) return { width, height }; const ratio = element.width / element.height || 1; return horizontal ? { width, height: clampDimension(width / ratio) } : { width: clampDimension(height * ratio), height }; }
export function resizeBox(element: TableElement, handle: ResizeHandle, delta: Point, keepAspect = element.keepAspectRatio): { width: number; height: number; x: number; y: number } {
  const { horizontal, vertical } = handleAxis(handle); const radians = -element.rotation * Math.PI / 180; const localDelta = { x: delta.x * Math.cos(radians) - delta.y * Math.sin(radians), y: delta.x * Math.sin(radians) + delta.y * Math.cos(radians) };
  const rawWidth = clampDimension(element.width + localDelta.x * horizontal); const rawHeight = clampDimension(element.height + localDelta.y * vertical); const sized = aspectSize(element, rawWidth, rawHeight, horizontal, keepAspect); const width = sized.width; const height = sized.height;
  const localShift = { x: (width - element.width) * horizontal / 2, y: (height - element.height) * vertical / 2 }; const cos = Math.cos(-radians); const sin = Math.sin(-radians);
  return { width, height, x: element.x + localShift.x * cos - localShift.y * sin, y: element.y + localShift.x * sin + localShift.y * cos };
}
export function snapRotationToAxes(rotation: number, sensitivity = 8) {
  const normalized = ((rotation % 360) + 360) % 360; const axis = (Math.round(normalized / 90) * 90) % 360; const distance = Math.abs((((normalized - axis) + 180) % 360) - 180);
  return distance <= sensitivity ? axis : normalized;
}
export function rotateAroundCenter(element: FloorElement, pointer: Point, startAngle?: number, startRotation = element.rotation) {
  const pointerAngle = Math.atan2(pointer.y - element.y, pointer.x - element.x) * 180 / Math.PI; const baseAngle = startAngle ?? -90; const rotation = startRotation + pointerAngle - baseAngle;
  return { rotation: snapRotationToAxes(rotation) } as Partial<FloorElement>;
}
export function rectBounds(element: TableElement) { return { x: element.x - element.width / 2, y: element.y - element.height / 2, width: element.width, height: element.height }; }
