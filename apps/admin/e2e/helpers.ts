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

// ── QA-22: massa de teste criada pelo próprio teste, via API (nada depende do seed nem de quem está rodando no simulador) ──

export interface TestCustomer {
  token: string;
  id: string;
  cpf: string;
  name: string;
}

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Cliente novo (sub único) com CPF próprio, KYC aprovado pelo mock e consentimentos de localização. */
export async function createCustomer(request: APIRequestContext): Promise<TestCustomer> {
  const tag = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  const sub = `e2e-admin-${tag}`;
  const tokenRes = await request.post(`${API}/dev/token`, { data: { sub, email: `${sub}@e2e.volti.dev`, groups: [], pool: 'customer' } });
  expect(tokenRes.ok()).toBeTruthy();
  const token = (await tokenRes.json()).accessToken as string;
  const headers = authHeaders(token);

  const me = await request.get(`${API}/me`, { headers });
  expect(me.ok()).toBeTruthy();
  const id = (await me.json()).id as string;
  const name = `Cliente E2E ${tag}`;
  expect((await request.patch(`${API}/me`, { headers, data: { name, phone: '+5511987654321' } })).ok()).toBeTruthy();
  const consents = await request.put(`${API}/lgpd/consents`, { headers, data: { termsVersion: '2026-10', termsAccepted: true, locationTracking: true, marketing: false } });
  expect(consents.ok(), `consents -> ${consents.status()}`).toBeTruthy();

  // CPF único (9 dígitos aleatórios + 42: o mock reprova CPF terminado em 00). O KYC só confere o prefixo das chaves dos arquivos.
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

/**
 * Inicia um aluguel (API, como cliente) numa moto do simulador e espera ela andar a >= 3 km/h.
 * Prefere uma moto livre que já esteja andando; senão destrava uma (o simulador sai andando ao destravar pelo shadow).
 */
export async function startRentalOnSimulatorBike(request: APIRequestContext): Promise<{ vehicleId: string; code: string; rentalId: string }> {
  type V = { id: string; code: string; status: string; speedKmh?: number; online?: boolean };
  const list = await apiGet<{ items: V[] }>(request, '/vehicles?limit=100');
  const sim = list.items.filter((v) => /^VLT-00(0[1-9]|[1-4]\d|50)$/.test(v.code) && v.status === 'free' && v.online !== false);
  expect(sim.length, 'nenhuma moto livre e online do simulador (VLT-0001..0050)').toBeGreaterThan(0);
  const bike = sim.find((v) => (v.speedKmh ?? 0) >= 3) ?? sim[sim.length - 1];

  const customer = await createCustomer(request);
  const headers = authHeaders(customer.token);
  const card = await request.post(`${API}/payments/cards`, { headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, data: { cardToken: 'tok_visa_4242' } });
  expect(card.ok(), `card -> ${card.status()}`).toBeTruthy();
  const reservation = await request.post(`${API}/reservations`, { headers, data: { vehicleId: bike.id } });
  expect(reservation.ok(), `reservation -> ${reservation.status()} ${await reservation.text()}`).toBeTruthy();
  const start = await request.post(`${API}/rentals`, {
    headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() },
    data: { vehicleId: bike.id, planCode: 'minute', coverage: 'basic', depositMethod: 'card' },
  });
  expect(start.ok(), `rental -> ${start.status()} ${await start.text()}`).toBeTruthy();
  const rentalId = ((await start.json()) as { rental: { id: string } }).rental.id;

  await expect
    .poll(async () => ((await vehicleByCode(request, bike.code)).speedKmh ?? 0), { timeout: 60_000, message: 'a moto do simulador precisa andar depois do aluguel' })
    .toBeGreaterThanOrEqual(3);
  return { vehicleId: bike.id, code: bike.code, rentalId };
}
