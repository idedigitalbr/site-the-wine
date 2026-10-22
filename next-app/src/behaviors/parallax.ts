import type { Cleanup } from './types';

type ParallaxItem = {
  container: HTMLElement;
  target: HTMLElement;
  speed: number;
  direction: 'horizontal' | 'vertical';
  currentY: number;
  targetY: number;
  currentX: number;
  targetX: number;
};

function createParallaxItem(target: HTMLElement, intensity: number): ParallaxItem {
  const container =
    target.closest<HTMLElement>('.parallax-container') ?? target.parentElement ?? target;
  const speedAttribute =
    target.dataset.parallaxSpeed ?? container.dataset.parallaxSpeed ?? null;
  const baseSpeed = Number.parseFloat(speedAttribute ?? '') || 0.15;
  const direction = isHorizontalParallax(target) ? 'horizontal' : 'vertical';

  return {
    container,
    target,
    speed: baseSpeed * intensity,
    direction,
    currentY: 0,
    targetY: 0,
    currentX: 0,
    targetX: 0,
  };
}

function isHorizontalParallax(target: HTMLElement): boolean {
  return target.dataset.parallaxDirection === 'horizontal'
    || target.classList.contains('parallax-img-h');
}

export function setupParallax(intensity = 0.22): Cleanup {
  if (window.innerWidth <= 768) return () => {};

  const targets = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.parallax-img, .parallax-img-h, .parallax-element',
    ),
  );

  const items: ParallaxItem[] = targets.map((target) => createParallaxItem(target, intensity));

  if (!items.length) return () => {};

  let isAnimating = false;
  let rafId = 0;

  const updateTargets = () => {
    const viewCenter = window.innerHeight / 2;

    items.forEach((item) => {
      const rect = item.container.getBoundingClientRect();
      const containerCenter = rect.top + rect.height / 2;
      const distance = viewCenter - containerCenter;

      if (item.direction === 'horizontal') {
        item.targetX = distance * item.speed;
      } else {
        item.targetY = distance * item.speed;
      }
    });
  };

  const animate = () => {
    let keepRunning = false;

    items.forEach((item) => {
      if (item.direction === 'horizontal') {
        const diffX = item.targetX - item.currentX;
        if (Math.abs(diffX) > 0.01) {
          item.currentX += diffX * 0.08;
          const roundedX = Math.round(item.currentX * 100) / 100;
          item.target.style.transform = `translate3d(calc(-50% + ${roundedX}px), 0, 0)`;
          item.target.style.setProperty('--parallax-x', `${roundedX}px`);
          keepRunning = true;
        }
      } else {
        const diffY = item.targetY - item.currentY;
        if (Math.abs(diffY) > 0.01) {
          item.currentY += diffY * 0.08;
          const roundedY = Math.round(item.currentY * 100) / 100;
          item.target.style.transform = `translate3d(0, ${roundedY}px, 0)`;
          item.target.style.setProperty('--parallax-y', `${roundedY}px`);
          keepRunning = true;
        }
      }
    });

    if (keepRunning) {
      rafId = window.requestAnimationFrame(animate);
    } else {
      isAnimating = false;
    }
  };

  const onScrollOrResize = () => {
    updateTargets();
    if (isAnimating) return;
    isAnimating = true;
    rafId = window.requestAnimationFrame(animate);
  };

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });

  updateTargets();
  isAnimating = true;
  rafId = window.requestAnimationFrame(animate);

  return () => {
    window.removeEventListener('scroll', onScrollOrResize);
    window.removeEventListener('resize', onScrollOrResize);
    if (rafId) window.cancelAnimationFrame(rafId);

    items.forEach((item) => {
      item.target.style.removeProperty('transform');
      item.target.style.removeProperty('--parallax-x');
      item.target.style.removeProperty('--parallax-y');
    });
  };
}
