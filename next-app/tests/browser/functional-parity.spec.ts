import { expect, test, type Page } from '@playwright/test';

const targets = [
  { name: 'legacy', url: 'http://127.0.0.1:4173' },
  { name: 'next', url: 'http://127.0.0.1:4174' },
] as const;

async function openSite(page: Page, url: string, width = 1366, height = 768) {
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

for (const target of targets) {
  test.describe(`${target.name} behavior contract`, () => {
    test('hero and menu videos preserve autoplay contract and sources', async ({ page }) => {
      await openSite(page, target.url);

      const hero = page.locator('#home video');
      const menu = page.locator('#cardapio video');

      for (const video of [hero, menu]) {
        const contract = await video.evaluate((element) => {
          const media = element as HTMLVideoElement;
          return {
            autoplay: media.autoplay,
            muted: media.muted,
            loop: media.loop,
            playsInline: media.playsInline,
          };
        });

        expect(contract).toEqual({
          autoplay: true,
          muted: true,
          loop: true,
          playsInline: true,
        });
      }

      await expect(hero.locator('source')).toHaveAttribute('src', /S1 TOPO HERO\/video-web-horizontal\.mp4$/);
      await expect(menu.locator('source')).toHaveAttribute('src', /CardapioMenu\/video-cardapio\.mp4$/);
    });

    test('header gains scrolled state', async ({ page }) => {
      await openSite(page, target.url);
      await page.evaluate(() => window.scrollTo(0, 240));

      await expect.poll(async () => (
        page.locator('#navbar').evaluate((element) => element.classList.contains('scrolled'))
      )).toBe(true);
    });

    test('mobile drawer opens and closes with the same contract', async ({ page }) => {
      await openSite(page, target.url, 390, 844);

      await page.locator('#hamburgerBtn').click();
      await expect(page.locator('#mobileNav')).toHaveClass(/open/);
      await expect(page.locator('#mobileOverlay')).toHaveClass(/visible/);

      await page.locator('#mobileNavClose').click();
      await expect(page.locator('#mobileNav')).not.toHaveClass(/open/);
      await expect(page.locator('#mobileOverlay')).not.toHaveClass(/visible/);
    });

    test('mobile events accordion activates the selected panel', async ({ page }) => {
      await openSite(page, target.url, 390, 844);

      const panels = page.locator('.tw-acc__panel');
      await panels.nth(1).locator('.tw-acc__link').click();

      await expect(panels.nth(0)).not.toHaveClass(/tw-acc__panel--active/);
      await expect(panels.nth(1)).toHaveClass(/tw-acc__panel--active/);
    });

    test('gallery opens, navigates and closes the lightbox', async ({ page }) => {
      await openSite(page, target.url);

      await page.locator('.gallery-item').first().click();
      await expect(page.locator('#lightbox')).toHaveClass(/active/);
      await expect(page.locator('#lightboxCounter')).toHaveText('01 / 12');

      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#lightboxCounter')).toHaveText('02 / 12');

      await page.keyboard.press('Escape');
      await expect(page.locator('#lightbox')).not.toHaveClass(/active/);
    });

    test('menu modal opens with 12 pages and closes with Escape', async ({ page }) => {
      await openSite(page, target.url);
      await page.waitForFunction(() => typeof (window as Window & { openMenuModal?: unknown }).openMenuModal === 'function');

      await page.locator('#cardapio .trigger-menu-modal').first().click();
      await expect(page.locator('#menuModal')).toHaveClass(/active/);
      await expect(page.locator('#menuModal')).toHaveAttribute('aria-hidden', 'false');
      await expect(page.locator('#menuPageTotal')).toHaveText('12');

      await page.keyboard.press('Escape');
      await expect(page.locator('#menuModal')).not.toHaveClass(/active/);
      await expect(page.locator('#menuModal')).toHaveAttribute('aria-hidden', 'true');
    });

    test('desktop parallax produces GPU transform values', async ({ page }) => {
      await openSite(page, target.url, 1366, 768);
      await page.evaluate(() => window.scrollTo(0, 520));

      await expect.poll(async () => (
        page.locator('#home .hero-content').evaluate((element) => (element as HTMLElement).style.transform)
      )).toContain('translate3d');
    });
  });
}
