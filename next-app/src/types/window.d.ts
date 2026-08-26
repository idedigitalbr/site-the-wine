export {};

declare global {
  interface Window {
    St?: {
      PageFlip?: new (...args: unknown[]) => unknown;
    };
    openMenuModal?: () => void;
    closeMenuModal?: () => void;
  }
}
