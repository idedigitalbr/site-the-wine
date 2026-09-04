import type { Cleanup } from './types';

export function setupMobileNavigation(): Cleanup {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavClose = document.getElementById('mobileNavClose');
  const links = Array.from(document.querySelectorAll<HTMLElement>('.mobile-nav-link'));

  if (!mobileNav) return () => {};

  const setScrollLock = (locked: boolean) => {
    document.documentElement.classList.toggle('mobile-nav-open', locked);
    document.body.classList.toggle('mobile-nav-open', locked);
  };

  const syncHamburger = (isOpen: boolean) => {
    if (!hamburgerBtn) return;
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
    hamburgerBtn.setAttribute('aria-label', isOpen ? 'Fechar Menu' : 'Abrir Menu');
  };

  const closeMenu = () => {
    mobileNav.classList.remove('open');
    mobileOverlay?.classList.remove('visible');
    syncHamburger(false);
    setScrollLock(false);
  };

  const toggleMenu = () => {
    const willOpen = !mobileNav.classList.contains('open');
    mobileNav.classList.toggle('open', willOpen);
    mobileOverlay?.classList.toggle('visible', willOpen);
    syncHamburger(willOpen);
    setScrollLock(willOpen);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && mobileNav.classList.contains('open')) {
      closeMenu();
    }
  };

  hamburgerBtn?.addEventListener('click', toggleMenu);
  mobileOverlay?.addEventListener('click', closeMenu);
  mobileNavClose?.addEventListener('click', closeMenu);
  links.forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', handleKeyDown);

  return () => {
    hamburgerBtn?.removeEventListener('click', toggleMenu);
    mobileOverlay?.removeEventListener('click', closeMenu);
    mobileNavClose?.removeEventListener('click', closeMenu);
    links.forEach((link) => link.removeEventListener('click', closeMenu));
    document.removeEventListener('keydown', handleKeyDown);
    mobileNav.classList.remove('open');
    mobileOverlay?.classList.remove('visible');
    setScrollLock(false);
    syncHamburger(false);
  };
}
