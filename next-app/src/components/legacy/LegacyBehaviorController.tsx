"use client";

import { useEffect } from 'react';
import { setupBookingModal } from '@/behaviors/bookingModal';
import { setupEventsAccordion } from '@/behaviors/eventsAccordion';
import { setupFooterYear } from '@/behaviors/footerYear';
import { setupGalleryLightbox } from '@/behaviors/galleryLightbox';
import { setupHeader } from '@/behaviors/header';
import { setupHeroLoop } from '@/behaviors/heroLoop';
import { setupMobileNavigation } from '@/behaviors/mobileNavigation';
import { setupParallax } from '@/behaviors/parallax';
import { setupReveal } from '@/behaviors/reveal';
import { setupScrollSpy } from '@/behaviors/scrollSpy';
import { setupSmoothScroll } from '@/behaviors/smoothScroll';
import type { Cleanup } from '@/behaviors/types';

export function LegacyBehaviorController() {
  useEffect(() => {
    const cleanups: Cleanup[] = [
      setupHeroLoop(),
      setupHeader(),
      setupMobileNavigation(),
      setupBookingModal(),
      setupReveal(),
      setupSmoothScroll(),
      setupScrollSpy(),
      setupParallax(),
      setupEventsAccordion(),
      setupGalleryLightbox(),
      setupFooterYear(),
    ];

    return () => {
      [...cleanups].reverse().forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
