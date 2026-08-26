import type { Cleanup } from './types';

export function setupHeader(): Cleanup {
  const navbar = document.getElementById('navbar');
  const mobileNav = document.getElementById('mobileNav');

  if (!navbar) return () => {};

  let lastScrollY = window.scrollY;
  let isTicking = false;
  let rafId = 0;

  const handleScroll = () => {
    if (isTicking) return;

    isTicking = true;
    rafId = window.requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;

      navbar.classList.toggle('scrolled', currentScrollY > 60);

      if (
        currentScrollY > lastScrollY &&
        currentScrollY > 120 &&
        mobileNav &&
        !mobileNav.classList.contains('open')
      ) {
        navbar.classList.add('header-hidden');
      } else {
        navbar.classList.remove('header-hidden');
      }

      lastScrollY = currentScrollY;
      isTicking = false;
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  return () => {
    window.removeEventListener('scroll', handleScroll);
    if (rafId) window.cancelAnimationFrame(rafId);
    navbar.classList.remove('scrolled', 'header-hidden');
  };
}
