"use client";

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { setupMenuFlipbook } from '@/behaviors/menuFlipbook';
import type { Cleanup } from '@/behaviors/types';

export function MenuFlipbookController() {
  const cleanupRef = useRef<Cleanup | null>(null);

  useEffect(() => () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  const initialize = () => {
    cleanupRef.current?.();
    cleanupRef.current = setupMenuFlipbook();
  };

  return (
    <Script
      id="the-wine-page-flip"
      src="/assets/js/page-flip.browser.js"
      strategy="afterInteractive"
      onReady={initialize}
    />
  );
}
