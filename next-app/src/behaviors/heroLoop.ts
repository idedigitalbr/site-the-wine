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
    void heroVideo.play().catch(() => {});
  };

  const requestPlayback = () => {
    if (!heroVideo.paused && !heroVideo.ended) return;
    void heroVideo.play().catch(() => {});
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') requestPlayback();
  };

  heroVideo.addEventListener('timeupdate', handleTimeUpdate);
  heroVideo.addEventListener('ended', handleEnded);
  heroVideo.addEventListener('canplay', requestPlayback);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  requestPlayback();

  return () => {
    heroVideo.removeEventListener('timeupdate', handleTimeUpdate);
    heroVideo.removeEventListener('ended', handleEnded);
    heroVideo.removeEventListener('canplay', requestPlayback);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
