import type { Cleanup } from './types';

export function setupMobileNavigation(): Cleanup {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavClose = document.getElementById('mobileNavClose');
  const links = Array.from(document.querySelectorAll<HTMLElement>('.mobile-nav-link'));

  if (!mobileNav) return () => {};

  const syncHamburger = (isOpen: boolean) => {
    if (!hamburgerBtn) return;
    const spans = hamburgerBtn.querySelectorAll<HTMLElement>('span');

    if (isOpen) {
      if (spans[0]) spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      if (spans[1]) spans[1].style.opacity = '0';
      if (spans[2]) spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      if (spans[0]) spans[0].style.transform = 'none';
      if (spans[1]) spans[1].style.opacity = '1';
      if (spans[2]) spans[2].style.transform = 'none';
    }
  };

  const toggleMenu = () => {
    mobileNav.classList.toggle('open');
    mobileOverlay?.classList.toggle('visible');
    syncHamburger(mobileNav.classList.contains('open'));
  };

  hamburgerBtn?.addEventListener('click', toggleMenu);
  mobileOverlay?.addEventListener('click', toggleMenu);
  mobileNavClose?.addEventListener('click', toggleMenu);
  links.forEach((link) => link.addEventListener('click', toggleMenu));

  return () => {
    hamburgerBtn?.removeEventListener('click', toggleMenu);
    mobileOverlay?.removeEventListener('click', toggleMenu);
    mobileNavClose?.removeEventListener('click', toggleMenu);
    links.forEach((link) => link.removeEventListener('click', toggleMenu));
    mobileNav.classList.remove('open');
    mobileOverlay?.classList.remove('visible');
    syncHamburger(false);
  };
}
