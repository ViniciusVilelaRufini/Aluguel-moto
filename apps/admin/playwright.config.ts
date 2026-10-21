import { defineConfig, devices } from '@playwright/test';

const API = process.env.E2E_API_URL ?? 'http://localhost:3004';
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', viewport: { width: 1440, height: 900 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { executablePath: process.env.E2E_CHROME || undefined } } }],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { NEXT_PUBLIC_API_BASE_URL: API, NEXT_PUBLIC_AUTH_MODE: 'dev' },
  },
});
