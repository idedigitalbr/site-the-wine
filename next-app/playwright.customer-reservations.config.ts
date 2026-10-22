import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['lista-de-reservas.spec.ts', 'floating-account-menu.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  use: {
    baseURL: process.env.CUSTOMER_RESERVATIONS_TEST_BASE_URL ?? 'http://127.0.0.1:3001',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    locale: 'pt-BR',
    viewport: { width: 1024, height: 640 },
    deviceScaleFactor: 1,
    contextOptions: { reducedMotion: 'reduce' },
  },
});
