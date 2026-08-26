import type { Cleanup } from './types';

export function setupReveal(): Cleanup {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal-up'));
  if (!elements.length) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.05,
      rootMargin: '0px 0px -40px 0px',
    },
  );

  elements.forEach((element) => observer.observe(element));

  return () => observer.disconnect();
}
