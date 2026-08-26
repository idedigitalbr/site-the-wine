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
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
    hamburgerBtn.setAttribute('aria-label', isOpen ? 'Fechar Menu' : 'Abrir Menu');
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
