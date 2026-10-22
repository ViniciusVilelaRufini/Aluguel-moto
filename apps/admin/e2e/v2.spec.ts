import { expect, test, type APIRequestContext } from '@playwright/test';
import { API, apiGet, apiToken, createCustomer, login, type TestCustomer } from './helpers';

/**
 * Contrato v2 no painel: endereço da moto (lista, ficha, busca), manutenção por km/horas e pedidos de clientes,
 * baterias (van e estação), catálogo de modelos com foto, assinatura com moto fixa, chave Pix mascarada
 * por grupo e estado das mensagens do chat. Massa criada pelo próprio teste via API.
 */

type V = { id: string; code: string; status: string; assignedSubscriptionId?: string; currentRentalId?: string };
const idem = () => ({ 'Idempotency-Key': crypto.randomUUID() });
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function freeVehicles(request: APIRequestContext, n: number): Promise<V[]> {
  const list = await apiGet<{ items: V[] }>(request, '/vehicles?limit=100&status=free');
  const ok = list.items.filter((v) => !v.assignedSubscriptionId && !v.currentRentalId && Number(v.code.slice(4)) > 50);
  expect(ok.length, 'motos livres fora do simulador').toBeGreaterThanOrEqual(n);
  return ok.sort(() => Math.random() - 0.5).slice(0, n);
}

/** Cliente com cartão, chave Pix (e-mail) e assinatura semanal com moto fixa. */
async function subscriber(request: APIRequestContext): Promise<TestCustomer & { subId: string; fixed: V; email: string }> {
  const c = await createCustomer(request);
  const email = `pix.${c.id.slice(0, 8)}@exemplo.com`;
  expect((await request.patch(`${API}/me`, { headers: bearer(c.token), data: { pixRefundKeyType: 'email', pixRefundKey: email } })).ok()).toBeTruthy();
  expect((await request.post(`${API}/payments/cards`, { headers: { ...bearer(c.token), ...idem() }, data: { cardToken: 'tok_visa_4242' } })).ok()).toBeTruthy();
  const [fixed] = await freeVehicles(request, 1);
  const sub = await request.post(`${API}/payments/subscriptions`, { headers: { ...bearer(c.token), ...idem() }, data: { planCode: 'weekly', vehicleId: fixed.id } });
  expect(sub.ok(), `subscription -> ${sub.status()} ${await sub.text()}`).toBeTruthy();
  return { ...c, subId: (await sub.json()).id as string, fixed, email };
}

test.describe.configure({ mode: 'serial' });

test('frota: lista com endereço, busca por endereço e ficha com revisão e bateria', async ({ page, request }) => {
  const v = await apiGet<{ id: string; code: string; address?: string; battery?: { serial: string; cycleCount: number } }>(request, '/vehicles/by-code/VLT-0001');
  expect(v.address, 'seed com endereço').toBeTruthy();
  const street = v.address!.split(',')[0];
  await login(page, 'admin');
  await page.goto('/fleet/');
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await expect(page.getByTestId('fleet-list')).toBeVisible();
  await page.getByTestId('fleet-search').fill(street);
  const row = page.getByTestId('fleet-list').getByRole('row', { name: /VLT-0001/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText(street);
  await row.click();
  const sheet = page.getByTestId('vehicle-sheet');
  await expect(sheet.getByTestId('vehicle-address')).toContainText(street);
  await expect(sheet.getByTestId('vehicle-service')).toContainText(/km/);
  await expect(sheet.getByTestId('vehicle-battery')).toContainText(`${v.battery!.serial} · ${v.battery!.cycleCount} ciclos`);

  // Paleta (Ctrl+K) também acha pelo endereço.
  await page.keyboard.press('Control+k');
  await page.getByTestId('command-palette').getByRole('combobox').fill(street);
  await expect(page.getByTestId('command-palette')).toContainText('VLT-0001');
});

test('operação: revisões por km/horas, agendar por linha e concluir registra a revisão', async ({ page }) => {
  await login(page, 'operacao');
  await page.goto('/tasks/');
  await page.getByRole('button', { name: 'Manutenção', exact: true }).click();
  await page.getByRole('button', { name: 'Vencidas', exact: true }).click();
  const table = page.getByTestId('service-table');
  await expect(table.getByRole('row').nth(1)).toContainText('Vencida');
  const row = table.getByRole('row').filter({ has: page.getByTestId('schedule-row') }).first();
  const code = (await row.locator('td').first().innerText()).trim();
  await row.getByTestId('schedule-row').click();
  await expect(page.getByTestId('maintenance-dialog').getByLabel('Código da moto')).toHaveValue(code);
  await page.getByTestId('maintenance-save').click();
  await expect(page.getByText('Manutenção agendada')).toBeVisible();
  await expect(table.getByRole('row', { name: new RegExp(code) })).toContainText('Agendada');

  await page.getByRole('button', { name: 'Agenda e pedidos' }).click();
  const agendaRow = page.getByTestId('agenda-table').getByRole('row', { name: new RegExp(code) }).first();
  await expect(agendaRow).toContainText('Painel');
  await agendaRow.getByTestId('complete-maintenance').click();
  await expect(page.getByText('Revisão registrada')).toBeVisible();
});

test('operação: pedido de manutenção do cliente do plano aparece na agenda', async ({ page, request }) => {
  const c = await subscriber(request);
  const slots = await request.get(`${API}/me/maintenance-slots?days=14`, { headers: bearer(c.token) });
  expect(slots.ok()).toBeTruthy();
  const slot = ((await slots.json()) as { items: { startsAt: string; available: boolean }[] }).items.find((s) => s.available)!;
  const req = await request.post(`${API}/me/maintenance-requests`, { headers: bearer(c.token), data: { slotStartsAt: slot.startsAt, description: 'Freio rangendo' } });
  expect(req.ok(), `maintenance request -> ${req.status()} ${await req.text()}`).toBeTruthy();

  await login(page, 'admin');
  await page.goto('/tasks/');
  await page.getByRole('button', { name: 'Manutenção', exact: true }).click();
  await page.getByRole('button', { name: 'Agenda e pedidos' }).click();
  await page.getByTestId('only-customer-requests').click();
  await expect(page.getByTestId('agenda-table').getByRole('row', { name: new RegExp(c.fixed.code) }).first()).toContainText(`Cliente · ${c.name}`);
});

test('baterias: carregar na van e descarregar na estação', async ({ page }) => {
  const serial = `BT-E2E-${Date.now().toString(36).toUpperCase()}`;
  await login(page, 'operacao');
  await page.goto('/tasks/');
  await page.getByRole('button', { name: 'Baterias', exact: true }).click();
  await expect(page.getByTestId('battery-counts')).toContainText('Na moto');
  await expect(page.getByTestId('stations-table').getByRole('row').nth(1)).toBeVisible();
  const before = Number((await page.getByTestId('van-summary').innerText()).match(/(\d+) no total/)![1]);

  await page.getByTestId('van-load').click();
  await page.getByTestId('transfer-serials').fill(serial.toLowerCase());
  await page.getByTestId('transfer-save').click();
  await expect(page.getByText('1 bateria(s) na van')).toBeVisible();
  await expect(page.getByTestId('van-summary')).toContainText(`${before + 1} no total`);
  await expect(page.getByText(`${serial} · 100%`)).toBeVisible();

  await page.getByTestId('van-unload').click();
  await page.getByTestId('transfer-serials').fill(serial);
  const station = await page.getByTestId('transfer-dest').locator('option').nth(1).innerText();
  await page.getByTestId('transfer-dest').selectOption({ index: 1 });
  await page.getByTestId('transfer-save').click();
  await expect(page.getByText('1 bateria(s) descarregada(s)')).toBeVisible();
  await expect(page.getByTestId('van-summary')).toContainText(`${before} no total`);

  await page.getByTestId('battery-search').fill(serial);
  const row = page.getByTestId('batteries-table').getByRole('row', { name: new RegExp(serial) });
  await expect(row).toContainText('Na estação');
  await expect(row).toContainText(station);
});

test('catálogo: novo modelo com foto (upload pré-assinado) e desbloqueio herdado do plano', async ({ page, request }) => {
  const name = `Volti E2E ${Date.now().toString(36)}`;
  await login(page, 'admin');
  await page.goto('/settings/');
  await expect(page.getByTestId('models-table').getByRole('row', { name: /Volti Flash/ })).toBeVisible();
  await page.getByTestId('new-model').click();
  const dlg = page.getByTestId('model-dialog');
  await dlg.getByTestId('model-name').fill(name);
  await dlg.getByTestId('model-category').fill('Teste');
  await dlg.getByTestId('model-price').fill('0,95');
  // PNG 1x1 transparente.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await dlg.getByTestId('model-photo-input').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png });
  await expect(dlg.getByTestId('model-photo-state')).toContainText('Foto nova enviada');
  await dlg.getByTestId('model-save').click();
  await expect(page.getByText('Modelo cadastrado')).toBeVisible();
  const row = page.getByTestId('models-table').getByRole('row', { name: new RegExp(name) });
  await expect(row).toContainText('(do plano)');

  const models = await apiGet<{ items: { name: string; photoObjectKey?: string; unlockFeeCents?: number; pricePerMinuteCents: number }[] }>(request, '/vehicle-models?includeInactive=true');
  const created = models.items.find((m) => m.name === name)!;
  expect(created.photoObjectKey).toMatch(/^catalog\//);
  expect(created.pricePerMinuteCents).toBe(95);
  expect(created.unlockFeeCents ?? null).toBeNull();

  // Desbloqueio próprio e depois de volta ao do plano.
  await row.click();
  await dlg.getByRole('switch', { name: 'Usar o desbloqueio do plano' }).click();
  await dlg.getByTestId('model-unlock').fill('1,50');
  await dlg.getByTestId('model-save').click();
  await expect(row).toContainText('1,50');
  await row.click();
  await dlg.getByRole('switch', { name: 'Usar o desbloqueio do plano' }).click();
  await dlg.getByTestId('model-save').click();
  await expect(row).toContainText('(do plano)');
});

test('catálogo: financeiro só visualiza', async ({ page }) => {
  await login(page, 'financeiro');
  await page.goto('/settings/');
  await expect(page.getByTestId('models-table').getByRole('row', { name: /Volti Flash/ })).toBeVisible();
  await expect(page.getByTestId('new-model')).toHaveCount(0);
});

test('clientes: plano, moto fixa trocada pelo admin e chave Pix completa', async ({ page, request }) => {
  const c = await subscriber(request);
  const [other] = (await freeVehicles(request, 2)).filter((v) => v.id !== c.fixed.id);
  await login(page, 'admin');
  await page.goto(`/customers/?customer=${c.id}`);
  const sheet = page.getByTestId('customer-sheet');
  await expect(sheet.getByTestId('pix-key')).toHaveText(`E-mail · ${c.email}`);
  const box = sheet.getByTestId('subscription-box');
  await expect(box).toContainText('Assinatura semanal');
  await expect(box.getByTestId('fixed-vehicle')).toHaveText(c.fixed.code);
  await box.getByTestId('assign-fixed').click();
  await page.getByTestId('subscription-vehicle-code').fill(other.code);
  await page.getByTestId('subscription-vehicle-save').click();
  await expect(page.getByText(`Moto fixa definida: ${other.code}`)).toBeVisible();
  await expect(box.getByTestId('fixed-vehicle')).toHaveText(other.code);
  await expect(box).toContainText('Ativa');
  const v = await apiGet<V>(request, `/vehicles/${other.id}`);
  expect(v.assignedSubscriptionId).toBe(c.subId);
});

test('clientes: suporte vê a chave Pix mascarada e não troca a moto fixa', async ({ page, request }) => {
  const c = await subscriber(request);
  await login(page, 'suporte');
  await page.goto(`/customers/?customer=${c.id}`);
  const sheet = page.getByTestId('customer-sheet');
  await expect(sheet.getByTestId('pix-key')).toHaveText(`E-mail · p***@exemplo.com`);
  await expect(sheet.getByTestId('subscription-box')).toBeVisible();
  await expect(sheet.getByTestId('assign-fixed')).toHaveCount(0);
});

test('suporte: estado da mensagem (enviada, entregue, lida) e leitura ao abrir a conversa', async ({ page, request }) => {
  const c = await createCustomer(request);
  const conv = await request.post(`${API}/support/conversations`, { headers: bearer(c.token), data: { subject: `Ajuda ${c.name}`, message: 'Minha moto não liga' } });
  expect(conv.ok(), `conversation -> ${conv.status()} ${await conv.text()}`).toBeTruthy();
  const convId = (await conv.json()).id as string;

  await login(page, 'suporte');
  await page.goto('/customers/?tab=support');
  await page.getByText(`Ajuda ${c.name}`).click();
  await expect(page.getByText('Minha moto não liga')).toBeVisible();
  // Abrir a conversa marca a mensagem do cliente como lida.
  await expect.poll(async () => {
    const r = await request.get(`${API}/support/conversations/${convId}/messages`, { headers: bearer(c.token) });
    return ((await r.json()) as { items: { authorType: string; status?: string }[] }).items.find((m) => m.authorType === 'customer')?.status;
  }).toBe('read');

  await page.getByPlaceholder('Escreva uma resposta').fill('Vamos verificar agora');
  await page.getByRole('button', { name: 'Enviar' }).click();
  const st = page.getByTestId('message-status').last();
  await expect(st).toHaveAttribute('data-status', 'sent');
  // Cliente busca a conversa (entregue) e marca como lida.
  await request.get(`${API}/support/conversations/${convId}/messages`, { headers: bearer(c.token) });
  await expect(st).toHaveAttribute('data-status', 'delivered', { timeout: 15_000 });
  await request.post(`${API}/support/conversations/${convId}/read`, { headers: bearer(c.token), data: {} });
  await expect(st).toHaveAttribute('data-status', 'read', { timeout: 15_000 });
  await expect(st).toHaveAttribute('aria-label', 'Lida');
});

test('operação: vê baterias e manutenção, mas não clientes nem catálogo', async ({ page, request }) => {
  const token = await apiToken(request, 'operacao');
  expect((await request.get(`${API}/batteries?limit=1`, { headers: bearer(token) })).ok()).toBeTruthy();
  await login(page, 'operacao');
  await expect(page.getByRole('link', { name: 'Clientes' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Preços e planos' })).toHaveCount(0);
  await page.goto('/tasks/');
  await expect(page.getByRole('button', { name: 'Baterias', exact: true })).toBeVisible();
});
