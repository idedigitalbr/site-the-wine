import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const LEGACY_URL = 'http://127.0.0.1:4173';
const NEXT_URL = 'http://127.0.0.1:4174';
const MAX_DIFF_RATIO = 0.01;

const viewports = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '820x1180', width: 820, height: 1180 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '430x932', width: 430, height: 932 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x800', width: 360, height: 800 },
] as const;

const stabilizationCss = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }

  html {
    scroll-behavior: auto !important;
  }

  video {
    opacity: 0 !important;
  }

  .gallery-track {
    transform: translateX(0) !important;
  }

  .reveal-up,
  .reveal-left,
  .reveal-right {
    opacity: 1 !important;
    transform: none !important;
  }
`;

async function settlePage(page: Page, url: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: stabilizationCss });

  await page.evaluate(async () => {
    window.scrollTo(0, 0);

    const videos = Array.from(document.querySelectorAll('video'));
    videos.forEach((video) => {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // O vídeo pode ainda não ter metadata. Ele fica visualmente oculto pelo CSS de estabilização.
      }
    });

    const images = Array.from(document.images);
    images.forEach((image) => {
      image.loading = 'eager';
    });

    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => window.setTimeout(resolve, 5_000)),
    ]);

    await Promise.all(images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };

          image.addEventListener('load', finish, { once: true });
          image.addEventListener('error', finish, { once: true });
          window.setTimeout(finish, 5_000);
        });
      }

      try {
        await image.decode();
      } catch {
        // Falha de decode será capturada visualmente no diff.
      }
    }));
  });

  await page.waitForTimeout(250);
}

async function attachImages(
  testInfo: TestInfo,
  label: string,
  legacyBuffer: Buffer,
  nextBuffer: Buffer,
  diffBuffer?: Buffer,
) {
  await testInfo.attach(`${label}-legacy`, { body: legacyBuffer, contentType: 'image/png' });
  await testInfo.attach(`${label}-next`, { body: nextBuffer, contentType: 'image/png' });

  if (diffBuffer) {
    await testInfo.attach(`${label}-diff`, { body: diffBuffer, contentType: 'image/png' });
  }
}

async function compareScreenshots(
  legacyPage: Page,
  nextPage: Page,
  testInfo: TestInfo,
  label: string,
  options: { fullPage?: boolean } = {},
) {
  const screenshotOptions = {
    animations: 'disabled' as const,
    fullPage: options.fullPage ?? false,
  };

  const legacyBuffer = await legacyPage.screenshot(screenshotOptions);
  const nextBuffer = await nextPage.screenshot(screenshotOptions);
  const legacyPng = PNG.sync.read(legacyBuffer);
  const nextPng = PNG.sync.read(nextBuffer);

  if (legacyPng.width !== nextPng.width || legacyPng.height !== nextPng.height) {
    await attachImages(testInfo, label, legacyBuffer, nextBuffer);
  }

  expect(
    { width: nextPng.width, height: nextPng.height },
    `${label}: Next e legado precisam gerar screenshots com a mesma geometria`,
  ).toEqual({ width: legacyPng.width, height: legacyPng.height });

  const diff = new PNG({ width: legacyPng.width, height: legacyPng.height });
  const mismatchedPixels = pixelmatch(
    legacyPng.data,
    nextPng.data,
    diff.data,
    legacyPng.width,
    legacyPng.height,
    {
      threshold: 0.12,
      includeAA: false,
    },
  );

  const totalPixels = legacyPng.width * legacyPng.height;
  const diffRatio = mismatchedPixels / totalPixels;

  if (diffRatio > MAX_DIFF_RATIO) {
    await attachImages(testInfo, label, legacyBuffer, nextBuffer, PNG.sync.write(diff));
  }

  expect(
    diffRatio,
    `${label}: ${(diffRatio * 100).toFixed(3)}% dos pixels diferem; limite ${(MAX_DIFF_RATIO * 100).toFixed(2)}%`,
  ).toBeLessThanOrEqual(MAX_DIFF_RATIO);
}

async function createPair(context: BrowserContext) {
  const legacyPage = await context.newPage();
  const nextPage = await context.newPage();
  return { legacyPage, nextPage } as const;
}

for (const viewport of viewports) {
  test(`full-page parity ${viewport.name}`, async ({ context }, testInfo) => {
    const { legacyPage, nextPage } = await createPair(context);

    try {
      await settlePage(legacyPage, LEGACY_URL, viewport.width, viewport.height);
      await settlePage(nextPage, NEXT_URL, viewport.width, viewport.height);
      await compareScreenshots(legacyPage, nextPage, testInfo, `full-${viewport.name}`, { fullPage: true });
    } finally {
      await legacyPage.close();
      await nextPage.close();
    }
  });
}

test('mobile drawer visual parity', async ({ context }, testInfo) => {
  const { legacyPage, nextPage } = await createPair(context);

  try {
    await settlePage(legacyPage, LEGACY_URL, 390, 844);
    await settlePage(nextPage, NEXT_URL, 390, 844);

    await legacyPage.locator('#hamburgerBtn').click();
    await nextPage.locator('#hamburgerBtn').click();
    await expect(legacyPage.locator('#mobileNav')).toHaveClass(/open/);
    await expect(nextPage.locator('#mobileNav')).toHaveClass(/open/);

    await compareScreenshots(legacyPage, nextPage, testInfo, 'mobile-drawer');
  } finally {
    await legacyPage.close();
    await nextPage.close();
  }
});

test('mobile events selected panel visual parity', async ({ context }, testInfo) => {
  const { legacyPage, nextPage } = await createPair(context);

  try {
    await settlePage(legacyPage, LEGACY_URL, 390, 844);
    await settlePage(nextPage, NEXT_URL, 390, 844);

    for (const page of [legacyPage, nextPage]) {
      const secondPanel = page.locator('.tw-acc__panel').nth(1);
      await secondPanel.locator('.tw-acc__link').click();
      await expect(secondPanel).toHaveClass(/tw-acc__panel--active/);
      await secondPanel.scrollIntoViewIfNeeded();
    }

    await compareScreenshots(legacyPage, nextPage, testInfo, 'mobile-events');
  } finally {
    await legacyPage.close();
    await nextPage.close();
  }
});

test('lightbox visual parity', async ({ context }, testInfo) => {
  const { legacyPage, nextPage } = await createPair(context);

  try {
    await settlePage(legacyPage, LEGACY_URL, 1366, 768);
    await settlePage(nextPage, NEXT_URL, 1366, 768);

    for (const page of [legacyPage, nextPage]) {
      await page.locator('.gallery-item').first().click();
      await expect(page.locator('#lightbox')).toHaveClass(/active/);
    }

    await compareScreenshots(legacyPage, nextPage, testInfo, 'lightbox');
  } finally {
    await legacyPage.close();
    await nextPage.close();
  }
});

test('menu modal visual parity', async ({ context }, testInfo) => {
  const { legacyPage, nextPage } = await createPair(context);

  try {
    await settlePage(legacyPage, LEGACY_URL, 1366, 768);
    await settlePage(nextPage, NEXT_URL, 1366, 768);

    for (const page of [legacyPage, nextPage]) {
      await page.waitForFunction(() => typeof (window as Window & { openMenuModal?: unknown }).openMenuModal === 'function');
      await page.locator('#cardapio .trigger-menu-modal').first().click();
      await expect(page.locator('#menuModal')).toHaveClass(/active/);
      await expect(page.locator('#menuPageTotal')).toHaveText('12');
      await expect(page.locator('#menuPdfLoading')).toBeHidden({ timeout: 15_000 });
    }

    await compareScreenshots(legacyPage, nextPage, testInfo, 'menu-modal');
  } finally {
    await legacyPage.close();
    await nextPage.close();
  }
});
