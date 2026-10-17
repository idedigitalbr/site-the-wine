import { defineConfig } from '@playwright/test';

const baseURL = process.env.RESERVATION_TEST_BASE_URL ?? 'http://127.0.0.1:3001';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: ['reservation-auth-navigation.spec.ts', 'reservation-v2-visual.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    locale: 'pt-BR',
    contextOptions: { reducedMotion: 'reduce' },
  },
});
