import type { Cleanup } from './types';

export function setupSmoothScroll(): Cleanup {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"], a[href^="/#"]'));
  const handlers = new Map<HTMLAnchorElement, EventListener>();

  anchors.forEach((anchor) => {
    const handler: EventListener = (event) => {
      const rawHref = anchor.getAttribute('href');
      if (!rawHref || rawHref === '#' || rawHref === '/#') return;

      const hash = rawHref.startsWith('/#') ? rawHref.slice(1) : rawHref;
      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      if (typeof window !== 'undefined' && window.history.pushState) {
        window.history.pushState(null, '', hash);
      }
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
