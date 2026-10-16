import { defineConfig } from '@playwright/test';

const baseURL = process.env.ACCOUNT_MENU_TEST_BASE_URL ?? 'http://127.0.0.1:3001';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'floating-account-menu.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 15_000,
  expect: { timeout: 3_000 },
  use: {
    baseURL,
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    locale: 'pt-BR',
    viewport: { width: 1440, height: 900 },
    contextOptions: { reducedMotion: 'no-preference' },
  },
});
