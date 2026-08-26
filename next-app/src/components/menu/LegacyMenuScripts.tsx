"use client";

import Script from 'next/script';
import { useState } from 'react';

export function LegacyMenuScripts() {
  const [pageFlipReady, setPageFlipReady] = useState(false);

  return (
    <>
      <Script
        id="the-wine-page-flip"
        src="/assets/js/page-flip.browser.js"
        strategy="afterInteractive"
        onLoad={() => setPageFlipReady(true)}
      />
      {pageFlipReady ? (
        <Script
          id="the-wine-menu-flipbook"
          src="/assets/js/menu-flipbook.js"
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
