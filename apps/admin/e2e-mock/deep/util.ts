import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { collect, type Collector } from '../helpers';
import type { Mock } from '../mock-api';

export const DEEP_SHOTS = path.join(__dirname, '..', '__shots__', 'deep');

export async function dshot(page: Page, name: string) {
  fs.mkdirSync(DEEP_SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(DEEP_SHOTS, `${name}.png`), caret: 'initial' });
}

export function watch(page: Page, mock: Mock): Collector { return collect(page, mock); }

/** Abre a ficha de uma moto pela paleta (Ctrl+K) e espera a ficha aparecer. */
export async function openVehicle(page: Page, code: string) {
  await page.goto('/fleet');
  await page.getByTestId('fleet-badge').waitFor();
  await page.keyboard.press('Control+k');
  await page.getByTestId('palette-input').fill(code);
  await page.keyboard.press('Enter');
  await page.getByTestId('vehicle-sheet').waitFor();
}

export const calls = (mock: Mock, p: RegExp | string, method = 'POST') =>
  mock.calls.filter((c) => c.method === method && (typeof p === 'string' ? c.path === p : p.test(c.path)));

/** Latencia de 200 ms no PATCH /maintenance/tasks/{id} (deixa o duplo clique acontecer antes da resposta). */
export async function fixMaintenancePatch(page: Page, _mock?: Mock) {
  await page.route('http://api.mock.local/maintenance/tasks/*', async (route) => {
    if (route.request().method() === 'PATCH') await new Promise((r) => setTimeout(r, 200));
    return route.fallback();
  });
}
