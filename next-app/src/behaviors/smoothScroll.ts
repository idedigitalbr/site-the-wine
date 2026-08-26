import type { Cleanup } from './types';

export function setupSmoothScroll(): Cleanup {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
  const handlers = new Map<HTMLAnchorElement, EventListener>();

  anchors.forEach((anchor) => {
    const handler: EventListener = (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || !href.startsWith('#')) return;

      const target = document.querySelector(href);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    };

    handlers.set(anchor, handler);
    anchor.addEventListener('click', handler);
  });

  return () => {
    handlers.forEach((handler, anchor) => {
      anchor.removeEventListener('click', handler);
    });
  };
}
