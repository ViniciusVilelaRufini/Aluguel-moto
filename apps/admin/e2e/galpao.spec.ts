import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { API, apiToken, createCustomer, login } from './helpers';

/**
 * Retirada em galpão no painel (spec 2026-10-22 §6). Cadastro, mapa e agenda rodam contra a API real
 * (Tasks 4 e 5). Entregas e disputas dependem da Task 6 (handovers) e ficam em `test.skip` até o merge.
 *
 * Higiene: todo galpão nasce longe de São Paulo (Maceió), fora das cercas e motos dos outros testes, e é
 * desativado no `afterEach`.
 */

const WEEKDAYS = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opensAt: '07:00', closesAt: '20:00' }));
const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: '00:00', closesAt: '23:59' }));
const FAR = { lat: -9.66, lng: -35.73 };
const far = () => ({ lat: FAR.lat - Math.random() / 100, lng: FAR.lng - Math.random() / 100 });

const created: string[] = [];

async function adminHeaders(request: APIRequestContext) {
  return { Authorization: `Bearer ${await apiToken(request, 'admin')}` };
}

async function createDepotApi(request: APIRequestContext, name: string, openingHours = WEEKDAYS): Promise<{ id: string; name: string }> {
  const res = await request.post(`${API}/depots`, { headers: await adminHeaders(request), data: { name, address: 'Rua E2E, 1 · Maceió', district: 'Centro', ...far(), openingHours } });
  expect(res.status(), await res.text()).toBe(201);
  const d = (await res.json()) as { id: string; name: string };
  created.push(d.id);
  return d;
}

/** Moto nova levada ao galpão pelo fluxo real: cadastro (fica em manutenção) e recolhimento concluído no galpão. */
async function vehicleInDepot(request: APIRequestContext, depotId: string): Promise<string> {
  const headers = await adminHeaders(request);
  const code = `VLT-9${String(Date.now()).slice(-6)}`;
  const v = await request.post(`${API}/vehicles`, { headers, data: { code, model: 'E2E Galpão', thingName: `e2e-${code.toLowerCase()}` } });
  expect(v.status(), await v.text()).toBe(201);
  const vehicleId = ((await v.json()) as { id: string }).id;
  const t = await request.post(`${API}/field-tasks`, { headers, data: { type: 'collect', vehicleId, priority: 'low' } });
  expect(t.status(), await t.text()).toBe(201);
  const taskId = ((await t.json()) as { id: string }).id;
  const started = await request.post(`${API}/field-tasks/${taskId}/start`, { headers });
  expect(started.ok(), await started.text()).toBeTruthy();
  const done = await request.post(`${API}/field-tasks/${taskId}/complete`, { headers, data: { depotId } });
  expect(done.ok(), await done.text()).toBeTruthy();
  return vehicleId;
}

/** Reserva "retirar agora" pela API (cliente com KYC aprovado, cartão fake, Idempotency-Key). */
async function reserveNow(request: APIRequestContext, depotId: string, vehicleId: string, name: string): Promise<{ id: string; cancel: () => Promise<void> }> {
  const customer = await createCustomer(request);
  const headers = { Authorization: `Bearer ${customer.token}` };
  expect((await request.patch(`${API}/me`, { headers, data: { name } })).ok()).toBeTruthy();
  const card = await request.post(`${API}/payments/cards`, { headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, data: { cardToken: 'tok_visa_4242' } });
  expect(card.ok(), `card -> ${card.status()}`).toBeTruthy();
  const res = await request.post(`${API}/reservations`, {
    headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() },
    data: { vehicleId, depotId, pickupMode: 'now', planCode: 'day', coverage: 'basic', depositMethod: 'card' },
  });
  expect(res.status(), await res.text()).toBe(201);
  const id = ((await res.json()) as { id: string }).id;
  return { id, cancel: async () => { await request.delete(`${API}/reservations/${id}`, { headers }); } };
}

test.afterEach(async ({ request }) => {
  const headers = await adminHeaders(request);
  while (created.length) {
    const id = created.pop()!;
    await request.patch(`${API}/depots/${id}`, { headers, data: { active: false } });
  }
});

async function openDepot(page: Page, name: string) {
  await page.goto('/galpoes');
  await page.getByTestId('depot-item').filter({ hasText: name }).click();
}

test.describe('galpões', () => {
  test('admin cadastra galpão com ponto no mapa e horário por dia', async ({ page, request }) => {
    const name = `E2E Galpão ${Date.now()}`;
    await login(page, 'admin');
    await page.goto('/galpoes');
    await page.getByTestId('depot-new').click();
    await expect(page.getByTestId('depot-form-title')).toHaveText('Novo galpão');

    await page.getByTestId('depot-name').fill(name);
    await page.getByTestId('depot-address').fill('Rua dos Testes, 100 · Pinheiros, São Paulo');
    await page.getByTestId('depot-district').fill('Pinheiros');

    // Sem ponto e com horário invertido: o painel recusa antes de chamar a API.
    await page.getByTestId('hours-1-opens').fill('20:00');
    await page.getByTestId('hours-1-closes').fill('07:00');
    await page.getByTestId('depot-save').click();
    await expect(page.getByTestId('hours-1-error')).toHaveText('A abertura precisa ser antes do fechamento');
    await expect(page.getByTestId('depot-point-hint')).toHaveText('Clique no mapa para marcar o ponto do galpão');

    for (const wd of [1, 2, 3, 4, 5]) {
      await page.getByTestId(`hours-${wd}-opens`).fill('07:00');
      await page.getByTestId(`hours-${wd}-closes`).fill('20:00');
    }
    await page.getByTestId('hours-6-opens').fill('09:00');
    await page.getByTestId('hours-0-open').click();
    await page.getByTestId('hours-0-opens').fill('10:00');
    await page.getByTestId('hours-0-closes').fill('14:00');
    await page.getByTestId('depot-max-days').fill('5');

    // Ponto longe de São Paulo: centraliza o mapa em Maceió antes do clique.
    await page.evaluate(([lng, lat]) => window.__voltiMap?.jumpTo({ center: [lng, lat], zoom: 14 }), [FAR.lng, FAR.lat]);
    await page.getByTestId('map').click();
    await expect(page.getByTestId('depot-point')).toBeVisible();

    await page.getByTestId('depot-save').click();
    await expect(page.getByText('Galpão criado')).toBeVisible();
    await expect(page.getByTestId('depot-form-title')).toHaveText('Editar galpão');
    // Admin pode desativar (não há exclusão no contrato).
    await expect(page.getByTestId('depot-deactivate')).toBeVisible();

    const token = await apiToken(request, 'admin');
    const list = (await (await request.get(`${API}/depots?includeInactive=true`, { headers: { Authorization: `Bearer ${token}` } })).json()) as { items: { id: string; name: string; openingHours: unknown[]; maxScheduleDays: number; timezone: string; lat: number }[] };
    const saved = list.items.find((d) => d.name === name)!;
    expect(saved).toBeTruthy();
    created.push(saved.id);
    expect(saved.lat).toBeGreaterThan(-12);
    expect(saved.timezone).toBe('America/Sao_Paulo');
    expect(saved.maxScheduleDays).toBe(5);
    expect(saved.openingHours).toEqual([
      { weekday: 0, opensAt: '10:00', closesAt: '14:00' },
      ...WEEKDAYS,
      { weekday: 6, opensAt: '09:00', closesAt: '18:00' },
    ]);

    await page.getByTestId('depots-panel').getByRole('button', { name: 'Fechar', exact: true }).click();
    await expect(page.getByTestId('depot-item').filter({ hasText: name })).toContainText('Seg–Sex 07:00–20:00 · Sáb 09:00–18:00 · Dom 10:00–14:00');
  });

  test('operacao edita o galpão mas não vê o botão de desativar', async ({ page, request }) => {
    const depot = await createDepotApi(request, `E2E Galpão op ${Date.now()}`);
    await login(page, 'operacao');
    await openDepot(page, depot.name);
    await expect(page.getByTestId('depot-form-title')).toHaveText('Editar galpão');
    await expect(page.getByTestId('depot-save')).toBeVisible();
    await expect(page.getByTestId('depot-deactivate')).toHaveCount(0);

    await page.getByTestId('depot-grace').fill('45');
    await page.getByTestId('depot-save').click();
    await expect(page.getByText('Galpão atualizado')).toBeVisible();
  });

  test('financeiro só visualiza os galpões', async ({ page }) => {
    await login(page, 'financeiro');
    await page.goto('/galpoes');
    await expect(page.getByText('Seu perfil só visualiza os galpões.')).toBeVisible();
    await expect(page.getByTestId('depot-new')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retiradas' })).toHaveCount(0);
  });

  test('suporte vê Entregas e não vê Galpões nem Retiradas', async ({ page }) => {
    await login(page, 'suporte');
    await expect(page.getByRole('button', { name: 'Entregas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Galpões' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retiradas' })).toHaveCount(0);
  });

  test('mapa da frota mostra o galpão e a legenda de aguardando recolhimento', async ({ page, request }) => {
    const depot = await createDepotApi(request, `E2E Galpão mapa ${Date.now()}`);
    await login(page, 'admin');
    await page.goto('/fleet');
    await expect(page.getByTestId('map-legend')).toContainText('Galpão');
    await expect(page.getByTestId('map-legend')).toContainText('Aguardando recolhimento');
    await expect(page.getByRole('button', { name: /Aguardando recolhimento/ })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => {
        const src = window.__voltiMap?.getSource('depots') as unknown as { serialize(): { data: GeoJSON.FeatureCollection } } | undefined;
        return (src?.serialize().data.features ?? []).map((f) => f.properties?.name as string);
      }), { timeout: 20_000 })
      .toContain(depot.name);
    expect(await page.evaluate(() => !!window.__voltiMap?.getLayer('depots-pin'))).toBe(true);
    expect(await page.evaluate(() => !!window.__voltiMap?.getLayer('vehicles-awaiting-halo'))).toBe(true);
  });
});

test.describe('agenda de retiradas', () => {
  test('galpão sem reservas mostra a agenda vazia', async ({ page, request }) => {
    const depot = await createDepotApi(request, `E2E Agenda vazia ${Date.now()}`);
    await login(page, 'admin');
    await page.goto('/retiradas');
    await page.getByTestId('pickups-depot').selectOption({ label: depot.name });
    await expect(page.getByText('Nenhuma retirada neste dia')).toBeVisible();
  });

  test('admin vê a reserva do dia (criada pela API) com só o primeiro nome e o horário de São Paulo', async ({ page, request }) => {
    const depot = await createDepotApi(request, `E2E Agenda ${Date.now()}`, ALL_WEEK);
    const vehicleId = await vehicleInDepot(request, depot.id);
    const first = `Ana${Date.now().toString(36).replace(/\d/g, '')}`;
    const reservation = await reserveNow(request, depot.id, vehicleId, `${first} Beatriz Sobrenome`);
    try {
      await login(page, 'admin');
      await page.goto('/retiradas');
      await page.getByTestId('pickups-depot').selectOption({ label: depot.name });
      const row = page.getByTestId('pickups-table').getByTestId('row');
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(first);
      await expect(row).not.toContainText('Beatriz');
      await expect(row).not.toContainText('Sobrenome');
      await expect(row).toContainText('Agora');
      await expect(row).toContainText('Aguardando');
      const hh = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(new Date());
      await expect(row).toContainText(`${hh}:`);
      await expect(page.getByTestId('pickups-stats')).toContainText('Reservas no dia (todas)');

      // Filtros: modo (no painel) e status (no servidor); os indicadores continuam do dia inteiro.
      await page.getByRole('button', { name: 'Agendadas' }).click();
      await expect(page.getByText('Nenhuma retirada neste dia')).toBeVisible();
      await page.getByRole('button', { name: 'Todas' }).click();
      await expect(row).toHaveCount(1);
      await page.getByTestId('pickups-status').selectOption('canceled');
      await expect(page.getByText('Nenhuma retirada neste dia')).toBeVisible();
    } finally {
      await reservation.cancel();
    }
  });

  test('operacao abre a agenda', async ({ page }) => {
    await login(page, 'operacao');
    await page.goto('/retiradas');
    await expect(page.getByRole('heading', { name: 'Agenda de retiradas' })).toBeVisible();
  });
});

test.describe('entregas e disputas', () => {
  // TODO(galpão Task 6): habilitar depois do merge de handovers em feat/galpao (POST /handovers + dispute pela API).
  test.skip('suporte vê a entrega com fotos e a disputa com "Abrir no suporte"', async ({ page }) => {
    await login(page, 'suporte');
    await page.goto('/entregas');
    await expect(page.getByRole('button', { name: 'Disputas' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('handovers-table').getByTestId('row').first().click();
    await expect(page.getByTestId('handover-photos').locator('img').first()).toBeVisible();
    await expect(page.getByTestId('dispute-reason')).toBeVisible();
    await expect(page.getByTestId('open-support')).toHaveAttribute('href', '/customers?tab=support');
  });
});
