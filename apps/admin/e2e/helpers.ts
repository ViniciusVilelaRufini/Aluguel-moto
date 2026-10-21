import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API = process.env.E2E_API_URL ?? 'http://localhost:3004';

export type Group = 'admin' | 'operacao' | 'financeiro' | 'suporte';
const LABEL: Record<Group, string> = { admin: 'Administrador', operacao: 'Operação', financeiro: 'Financeiro', suporte: 'Suporte' };

export async function login(page: Page, group: Group = 'admin') {
  await page.goto('/login');
  await page.getByTestId('group-select').selectOption({ label: LABEL[group] });
  await page.getByTestId('login-continue').click();
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('logout')).toBeVisible();
}

export async function apiToken(request: APIRequestContext, group: Group = 'admin'): Promise<string> {
  const res = await request.post(`${API}/dev/token`, {
    data: { sub: `dev-${group}`, email: `${group}@volti.dev`, groups: [group], pool: 'staff' },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).accessToken as string;
}

export async function apiGet<T>(request: APIRequestContext, path: string, group: Group = 'admin'): Promise<T> {
  const token = await apiToken(request, group);
  const res = await request.get(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(res.ok(), `${path} -> ${res.status()}`).toBeTruthy();
  return (await res.json()) as T;
}

export async function vehicleByCode(request: APIRequestContext, code: string): Promise<{ id: string; code: string; status: string; speedKmh?: number }> {
  return apiGet(request, `/vehicles/by-code/${code}`);
}

/**
 * Desenha um polígono no mapa: o Draw precisa de um mousemove antes de cada clique e fecha o polígono
 * quando o último vértice é clicado de novo.
 */
export async function drawPolygon(page: Page, offset = 0) {
  const map = page.getByTestId('map');
  const box = (await map.boundingBox())!;
  const cx = box.x + box.width / 2 + offset;
  const cy = box.y + box.height / 2 + offset;
  const pts: [number, number][] = [[-80, -60], [80, -60], [80, 60], [-80, 60]];
  for (const [dx, dy] of pts) {
    await page.mouse.move(cx + dx, cy + dy, { steps: 5 });
    await page.mouse.down();
    await page.mouse.up();
  }
  await page.mouse.down();
  await page.mouse.up();
}
