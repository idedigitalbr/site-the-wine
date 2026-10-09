import type { Cleanup } from './types';

export function setupEventsAccordion(): Cleanup {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.tw-acc__panel'));
  if (!panels.length) return () => {};

  const isMobile = () => window.matchMedia('(max-width: 860px)').matches;
  const handlers = new Map<HTMLElement, EventListener>();

  panels.forEach((panel) => {
    const link = panel.querySelector<HTMLElement>('.tw-acc__link');
    if (!link) return;

    const handler: EventListener = (event) => {
      if (!isMobile()) return;

      const target = event.target;
      if (target instanceof Element && target.closest('.tw-acc__btn')) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      panels.forEach((current) => {
        current.classList.remove('tw-acc__panel--active');
      });
      panel.classList.add('tw-acc__panel--active');

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          panel.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        });
      });
    };

    handlers.set(link, handler);
    link.addEventListener('click', handler);
  });

  return () => {
    handlers.forEach((handler, link) => {
      link.removeEventListener('click', handler);
    });
  };
}
