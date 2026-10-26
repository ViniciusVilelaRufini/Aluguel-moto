import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** E2E_CHROME tem prioridade; senao usa o primeiro Chromium do cache do Playwright (ou o Chrome instalado). */
function findChrome(): string | undefined {
  if (process.env.E2E_CHROME) return process.env.E2E_CHROME;
  const cache = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  const candidates: string[] = [];
  try {
    for (const d of fs.readdirSync(cache).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse()) {
      candidates.push(path.join(cache, d, 'chrome-win', 'chrome.exe'), path.join(cache, d, 'chrome-win64', 'chrome.exe'));
    }
  } catch { /* sem cache */ }
  candidates.push('C:/Program Files/Google/Chrome/Application/chrome.exe');
  return candidates.find((p) => fs.existsSync(p));
}

/**
 * Suite com API mockada: nao precisa de Docker, API local nem rede.
 * Rodar (em apps/admin):  pnpm exec playwright test -c playwright.mock.config.ts
 */
const PORT = Number(process.env.MOCK_PORT ?? 3100);

export default defineConfig({
  testDir: './e2e-mock',
  testMatch: /.*\.spec\.ts/,
  outputDir: './e2e-mock/__results__',
  timeout: 240_000,
  expect: { timeout: 6_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off', actionTimeout: 5_000, navigationTimeout: 30_000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { executablePath: findChrome() } } }],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { NEXT_PUBLIC_API_BASE_URL: 'http://api.mock.local', NEXT_PUBLIC_AUTH_MODE: 'dev' },
  },
});
