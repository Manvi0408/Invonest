import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for InvoNest.
 *
 * Assumes the backend (:3001) is already running. The frontend (:3000) is started
 * automatically if it isn't up yet — an existing dev server is reused.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      // Tall window: the card fits, so nothing should scroll and nothing should gap.
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 880 } },
    },
    {
      // Short window: the card overflows, so scrolling MUST work. This is the
      // regression that the `fixed inset-0 overflow-y-auto` scroller fixed.
      name: 'short-window',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 500 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: 'npm run dev:frontend',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
