import type { Cleanup } from './types';

export function setupHeroLoop(): Cleanup {
  const heroVideo = document.querySelector<HTMLVideoElement>('.hero-bg video');
  const heroContent = document.querySelector<HTMLElement>('.hero-content');

  if (!heroVideo || !heroContent) return () => {};

  let lastVideoTime = 0;

  const resetHeroLogoAnim = () => {
    heroContent.style.animation = 'none';
    void heroContent.offsetHeight;
    heroContent.style.animation = '';
  };

  const handleTimeUpdate = () => {
    if (heroVideo.currentTime < lastVideoTime - 0.5) {
      resetHeroLogoAnim();
    }
    lastVideoTime = heroVideo.currentTime;
  };

  const handleEnded = () => {
    resetHeroLogoAnim();
    void heroVideo.play();
  };

  heroVideo.addEventListener('timeupdate', handleTimeUpdate);
  heroVideo.addEventListener('ended', handleEnded);

  return () => {
    heroVideo.removeEventListener('timeupdate', handleTimeUpdate);
    heroVideo.removeEventListener('ended', handleEnded);
  };
}
