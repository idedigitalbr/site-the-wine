import type { Cleanup } from './types';

type SectionMetric = {
  id: string;
  top: number;
  height: number;
};

export function setupScrollSpy(): Cleanup {
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>('section[id], footer[id], div[id].tw-acc-header'),
  );
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav-link'));
  const mobileNavLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('.mobile-nav-link'),
  );

  if (!sections.length) return () => {};

  let sectionCache: SectionMetric[] = [];
  let pending = false;
  let rafId = 0;

  const updateSectionCache = () => {
    sectionCache = sections.map((section) => ({
      id: section.id,
      top: section.offsetTop,
      height: section.offsetHeight,
    }));
  };

  const updateActiveLink = (links: HTMLAnchorElement[], id: string) => {
    links.forEach((link) => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === `#${id}` || href === `/#${id}`);
    });
  };

  const scrollSpy = () => {
    pending = false;
    const scrollPosition = window.scrollY + 160;

    const activeSection = sectionCache.find(
      (section) =>
        scrollPosition >= section.top &&
        scrollPosition < section.top + section.height,
    );

    if (!activeSection) return;

    updateActiveLink(navLinks, activeSection.id);
    updateActiveLink(mobileNavLinks, activeSection.id);
  };

  const requestScrollSpy = () => {
    if (pending) return;
    pending = true;
    rafId = window.requestAnimationFrame(scrollSpy);
  };

  updateSectionCache();
  scrollSpy();

  window.addEventListener('load', updateSectionCache);
  window.addEventListener('resize', updateSectionCache, { passive: true });
  window.addEventListener('scroll', requestScrollSpy, { passive: true });

  return () => {
    window.removeEventListener('load', updateSectionCache);
    window.removeEventListener('resize', updateSectionCache);
    window.removeEventListener('scroll', requestScrollSpy);
    if (rafId) window.cancelAnimationFrame(rafId);
  };
}
