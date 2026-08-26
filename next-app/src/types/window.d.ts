export {};

type PageFlipEvent = { data: number };

type PageFlipSettings = {
  minWidth: number;
  drawShadow: boolean;
  maxShadowOpacity: number;
  flippingTime: number;
};

type PageFlipBounds = {
  pageWidth?: number;
  left?: number;
};

type PageFlipInstance = {
  on: (event: string, handler: (payload: PageFlipEvent) => void) => void;
  loadFromImages: (images: string[]) => void;
  getCurrentPageIndex?: () => number;
  getSettings?: () => PageFlipSettings;
  getUI?: () => { getCanvas?: () => HTMLCanvasElement | null } | null;
  getRender?: () => {
    getContext?: () => CanvasRenderingContext2D | null;
    update: () => void;
  } | null;
  getBoundsRect?: () => PageFlipBounds;
  flipPrev?: (corner?: string) => void;
  flipNext?: (corner?: string) => void;
  turnToPage?: (pageIndex: number) => void;
  flip?: (pageIndex: number, corner?: string) => void;
  userStop?: (point: { x: number; y: number }, force: boolean) => void;
  update: () => void;
  destroy?: () => void;
};

declare global {
  interface Window {
    St?: {
      PageFlip?: new (element: HTMLElement, options: Record<string, unknown>) => PageFlipInstance;
    };
    openMenuModal?: () => void;
    closeMenuModal?: () => void;
  }
}
