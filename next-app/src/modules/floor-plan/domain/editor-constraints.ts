import type { FloorElement, FloorPlanDocument, Point, TableElement } from './model';
import { snap } from './element-transforms';

function rotate(point: Point, center: Point, degrees: number): Point {
  const radians = degrees * Math.PI / 180; const cos = Math.cos(radians); const sin = Math.sin(radians); const x = point.x - center.x; const y = point.y - center.y;
  return { x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos };
}
function cornersOf(element: TableElement): Point[] {
  const halfWidth = element.width / 2; const halfHeight = element.height / 2;
  return [-1, 1].flatMap((x) => [-1, 1].map((y) => rotate({ x: element.x + x * halfWidth, y: element.y + y * halfHeight }, { x: element.x, y: element.y }, element.rotation)));
}
function boundsOf(element: TableElement) {
  const points = cornersOf(element); const xs = points.map((point) => point.x); const ys = points.map((point) => point.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}
function translate(element: TableElement, delta: Point): TableElement { return { ...element, x: element.x + delta.x, y: element.y + delta.y }; }
export function snapElementToGrid(element: FloorElement, grid: number): FloorElement { const snapped = { x: snap(element.x, grid), y: snap(element.y, grid) }; return translate(element, { x: snapped.x - element.x, y: snapped.y - element.y }); }
export function constrainElementToBounds(element: FloorElement, document: Pick<FloorPlanDocument, 'width' | 'height'>): FloorElement {
  const bounds = boundsOf(element); const width = bounds.maxX - bounds.minX; const height = bounds.maxY - bounds.minY; const x = width > document.width ? (document.width - (bounds.minX + bounds.maxX)) / 2 : Math.max(0, Math.min(document.width - bounds.maxX, -bounds.minX)); const y = height > document.height ? (document.height - (bounds.minY + bounds.maxY)) / 2 : Math.max(0, Math.min(document.height - bounds.maxY, -bounds.minY));
  return translate(element, { x, y });
}
export function applyEditorConstraints(element: FloorElement, document: FloorPlanDocument, options: { snapToGrid: boolean; keepObjectsInBounds: boolean; snapPosition?: boolean; snapSize?: boolean }): FloorElement {
  let next = element;
  if (options.snapToGrid && options.snapPosition !== false) next = snapElementToGrid(next, document.grid);
  if (options.snapToGrid && options.snapSize !== false) next = { ...next, width: Math.max(1, snap(next.width, document.grid)), height: Math.max(1, snap(next.height, document.grid)) };
  if (options.keepObjectsInBounds) next = constrainElementToBounds(next, document);
  return next;
}
export function constrainResize(element: FloorElement, document: FloorPlanDocument, options: { snapToGrid: boolean; keepObjectsInBounds: boolean }): FloorElement { return applyEditorConstraints(element, document, options); }
export function elementAabb(element: FloorElement) { return boundsOf(element); }
