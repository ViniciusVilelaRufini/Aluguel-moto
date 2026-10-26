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

/**
 * O mock-api.ts le o id em seg[1] ("plans" em /pricing/plans/{id}), entao PUT de precos devolve 404.
 * Este override (registrado depois, tem prioridade) aplica o PUT usando o ultimo segmento do caminho.
 */
export async function fixPricingPut(page: Page, mock: Mock) {
  await page.route('http://api.mock.local/pricing/**', async (route) => {
    const req = route.request();
    if (req.method() !== 'PUT') return route.fallback();
    const id = new URL(req.url()).pathname.split('/').pop()!;
    const kind = new URL(req.url()).pathname.split('/')[2] as 'plans' | 'fees' | 'coupons';
    const body = JSON.parse(req.postData() ?? '{}');
    mock.calls.push({ method: 'PUT', path: new URL(req.url()).pathname, query: new URL(req.url()).searchParams, body });
    const list = mock.db[kind] as { id: string }[];
    const item = list.find((x) => x.id === id);
    const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (!item) return route.fulfill({ status: 404, headers, body: JSON.stringify({ type: 'x/not-found', title: 'Nao encontrado', status: 404 }) });
    Object.assign(item, body);
    return route.fulfill({ status: 200, headers, body: JSON.stringify(item) });
  });
}

/** Idem fixPricingPut para PATCH /maintenance/tasks/{id} (mock-api.ts usa seg[1] = "tasks"). */
export async function fixMaintenancePatch(page: Page, mock: Mock) {
  await page.route('http://api.mock.local/maintenance/tasks/*', async (route) => {
    const req = route.request();
    if (req.method() !== 'PATCH') return route.fallback();
    const u = new URL(req.url());
    const id = u.pathname.split('/').pop()!;
    const body = JSON.parse(req.postData() ?? '{}');
    mock.calls.push({ method: 'PATCH', path: u.pathname, query: u.searchParams, body });
    await new Promise((r) => setTimeout(r, 200));
    const item = (mock.db.maintenance as { id: string }[]).find((x) => x.id === id);
    const headers = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (!item) return route.fulfill({ status: 404, headers, body: JSON.stringify({ type: 'x/not-found', title: 'Nao encontrado', status: 404 }) });
    Object.assign(item, body);
    return route.fulfill({ status: 200, headers, body: JSON.stringify(item) });
  });
}
