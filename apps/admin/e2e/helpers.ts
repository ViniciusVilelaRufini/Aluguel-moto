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

// Massa de teste criada pelo próprio teste, via API (mesma abordagem do QA-22 em fix/qa-infra):
// não depende de haver cliente com CPF na primeira página da lista.
export interface TestCustomer { token: string; id: string; cpf: string; name: string }

/** Cliente novo (sub único) com CPF próprio, KYC aprovado pelo mock e consentimentos de localização. */
export async function createCustomer(request: APIRequestContext): Promise<TestCustomer> {
  const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const sub = `e2e-admin-${tag}`;
  const tokenRes = await request.post(`${API}/dev/token`, { data: { sub, email: `${sub}@e2e.volti.dev`, groups: [], pool: 'customer' } });
  expect(tokenRes.ok()).toBeTruthy();
  const token = (await tokenRes.json()).accessToken as string;
  const headers = { Authorization: `Bearer ${token}` };
  const me = await request.get(`${API}/me`, { headers });
  expect(me.ok()).toBeTruthy();
  const id = (await me.json()).id as string;
  const name = `Cliente E2E ${tag}`;
  expect((await request.patch(`${API}/me`, { headers, data: { name, phone: '+5511987654321' } })).ok()).toBeTruthy();
  const consents = await request.put(`${API}/lgpd/consents`, { headers, data: { termsVersion: '2026-10', termsAccepted: true, locationTracking: true, marketing: false } });
  expect(consents.ok(), `consents -> ${consents.status()}`).toBeTruthy();
  // CPF único (9 dígitos aleatórios + 42: o mock reprova CPF terminado em 00).
  const cpf = `${String(Math.floor(Math.random() * 1e9)).padStart(9, '1')}42`;
  const submit = await request.post(`${API}/kyc/submit`, {
    headers,
    data: { fullName: name, cpf, birthDate: '1990-05-10', documentType: 'cnh', documentFrontObjectKey: `kyc/${id}/document-front`, selfieObjectKey: `kyc/${id}/selfie` },
  });
  expect(submit.ok(), `kyc submit -> ${submit.status()} ${await submit.text()}`).toBeTruthy();
  await expect
    .poll(async () => ((await (await request.get(`${API}/kyc/status`, { headers })).json()) as { status: string }).status, { timeout: 20_000 })
    .toBe('approved');
  return { token, id, cpf, name };
}
