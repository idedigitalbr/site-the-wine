export type ViewportBounds = { x: number; y: number; width: number; height: number };

export const MAX_FLOOR_PLAN_ZOOM = 24;

export function viewportForBounds(bounds: ViewportBounds, viewportWidth: number, viewportHeight: number, padding = 24) {
  const availableWidth = Math.max(1, viewportWidth - padding * 2); const availableHeight = Math.max(1, viewportHeight - padding * 2); const zoom = Math.max(0.0001, Math.min(MAX_FLOOR_PLAN_ZOOM, Math.min(availableWidth / Math.max(1, bounds.width), availableHeight / Math.max(1, bounds.height))));
  return { x: viewportWidth / 2 - (bounds.x + bounds.width / 2) * zoom, y: viewportHeight / 2 - (bounds.y + bounds.height / 2) * zoom, zoom };
}

export function sceneBoundsToViewport(bounds: ViewportBounds, sceneWidth: number, sceneHeight: number, viewportWidth: number, viewportHeight: number): ViewportBounds {
  return { x: bounds.x / sceneWidth * viewportWidth, y: bounds.y / sceneHeight * viewportHeight, width: bounds.width / sceneWidth * viewportWidth, height: bounds.height / sceneHeight * viewportHeight };
}

export function viewportForSceneBounds(bounds: ViewportBounds, sceneWidth: number, sceneHeight: number, viewportWidth: number, viewportHeight: number, padding = 24) {
  return viewportForBounds(sceneBoundsToViewport(bounds, sceneWidth, sceneHeight, viewportWidth, viewportHeight), viewportWidth, viewportHeight, padding);
}
