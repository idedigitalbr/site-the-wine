import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    headless: true,
    locale: 'pt-BR',
    contextOptions: {
      reducedMotion: 'reduce',
    },
    deviceScaleFactor: 1,
  },
  webServer: [
    {
      command: 'node scripts/serve-legacy.mjs',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: 'npm run dev -- -p 4174',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
