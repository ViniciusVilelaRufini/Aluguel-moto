import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { calls, s3 } from './util3';
import { override } from './fixtures3';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function openModels(page: Page, group: 'admin' | 'financeiro' | 'operacao' = 'admin') {
  const mock = await loginMocked(page, { group });
  await page.goto('/settings');
  await expect(page.getByTestId('models-table')).toBeVisible();
  return mock;
}

test.describe('catalogo: foto do modelo (presigned PUT)', () => {
  test('enviar foto: POST /uploads com contentType, PUT no uploadUrl com o arquivo, objectKey vai no cadastro', async ({ page }) => {
    const mock = await openModels(page);
    const puts: { url: string; type: string | undefined; size: number }[] = [];
    await page.route('http://api.mock.local/upload', async (route) => {
      const r = route.request();
      puts.push({ url: r.url(), type: r.headers()['content-type'], size: r.postDataBuffer()?.length ?? 0 });
      return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: '' });
    });
    await override(page, mock, 'POST', /api\.mock\.local\/vehicle-models\/uploads/, { uploadUrl: 'http://api.mock.local/upload', method: 'PUT', headers: { 'Content-Type': 'image/png' }, objectKey: 'catalog/x.png', expiresAt: '2026-10-26T16:00:00.000Z' }, 201);
    await page.getByTestId('new-model').click();
    await page.getByTestId('model-photo-input').setInputFiles({ name: 'moto.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByTestId('model-photo-state')).toContainText('Foto nova enviada');
    expect(calls(mock, '/vehicle-models/uploads')[0]!.body).toEqual({ contentType: 'image/png' });
    expect(puts).toHaveLength(1);
    expect(puts[0]!.size).toBe(PNG.length);
    await page.getByTestId('model-name').fill('Modelo Foto');
    await page.getByTestId('model-category').fill('Urbana');
    await page.getByTestId('model-price').fill('0,50');
    await page.getByTestId('model-unlock-inherited').waitFor().catch(() => {});
    await s3(page, 'model-photo');
    await page.getByTestId('model-save').click();
    await expect.poll(() => calls(mock, '/vehicle-models').length).toBe(1);
    expect((calls(mock, '/vehicle-models')[0]!.body as { photoObjectKey?: string }).photoObjectKey).toBe('catalog/x.png');
  });

  test('arquivo GIF/PDF e arquivo > 5 MB sao recusados sem chamar a API', async ({ page }) => {
    const mock = await openModels(page);
    await page.getByTestId('new-model').click();
    await page.getByTestId('model-photo-input').setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: PNG });
    await expect(page.getByTestId('model-dialog')).toContainText(/JPG|PNG|formato/i);
    await page.getByTestId('model-photo-input').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 10) });
    await expect(page.getByTestId('model-dialog')).toContainText(/5 MB/);
    expect(calls(mock, '/vehicle-models/uploads')).toHaveLength(0);
  });

  test('PUT do S3 falha (403): mostra erro, nao marca foto como enviada e permite salvar sem foto', async ({ page }) => {
    const mock = await openModels(page);
    await override(page, mock, 'POST', /api\.mock\.local\/vehicle-models\/uploads/, { uploadUrl: 'http://api.mock.local/upload', method: 'PUT', headers: {}, objectKey: 'catalog/y.png', expiresAt: '2026-10-26T16:00:00.000Z' }, 201);
    await page.route('http://api.mock.local/upload', (route) => route.fulfill({ status: 403, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: '' }));
    await page.getByTestId('new-model').click();
    await page.getByTestId('model-photo-input').setInputFiles({ name: 'moto.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByTestId('model-dialog')).toContainText(/Falha ao enviar a foto \(403\)/);
    await expect(page.getByTestId('model-photo-state')).not.toContainText('Foto nova enviada');
    await expect(page.getByTestId('model-save')).toBeEnabled();
  });

  test('[BUG P3-09] preview da foto nova nao vaza object URL: revoga ao trocar/fechar', async ({ page }) => {
    const mock = await openModels(page);
    await override(page, mock, 'POST', /api\.mock\.local\/vehicle-models\/uploads/, { uploadUrl: 'http://api.mock.local/upload', method: 'PUT', headers: {}, objectKey: 'catalog/z.png', expiresAt: '2026-10-26T16:00:00.000Z' }, 201);
    await page.route('http://api.mock.local/upload', (route) => route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: '' }));
    await page.addInitScript(() => {
      const w = window as unknown as { __created: number; __revoked: number };
      w.__created = 0; w.__revoked = 0;
      const c = URL.createObjectURL.bind(URL); const r = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = (o: Blob | MediaSource) => { w.__created++; return c(o); };
      URL.revokeObjectURL = (u: string) => { w.__revoked++; return r(u); };
    });
    await page.reload();
    await expect(page.getByTestId('models-table')).toBeVisible();
    await page.getByTestId('new-model').click();
    for (let i = 0; i < 2; i++) await page.getByTestId('model-photo-input').setInputFiles({ name: `m${i}.png`, mimeType: 'image/png', buffer: PNG });
    await expect(page.getByTestId('model-photo-state')).toContainText('Foto nova enviada');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    const n = await page.evaluate(() => { const w = window as unknown as { __created: number; __revoked: number }; return { c: w.__created, r: w.__revoked }; });
    expect(n.r, `criou ${n.c} object URLs e revogou ${n.r}`).toBeGreaterThanOrEqual(n.c);
  });

  test('operacao nao ve "Novo modelo"; linhas nao sao clicaveis', async ({ page }) => {
    await openModels(page, 'operacao').catch(() => {});
    await expect(page.getByTestId('new-model')).toHaveCount(0);
  });
});

async function openCustomerWithSub(page: Page, group: 'admin' | 'operacao' | 'suporte' = 'admin') {
  const mock = await loginMocked(page, { group });
  await override(page, mock, 'GET', /api\.mock\.local\/customers\/cus-001$/, { id: 'cus-001', email: 'c1@teste.com', name: 'Cliente Teste 01', cpf: '12345678901', kycStatus: 'approved', status: 'active', locationConsent: true, activePlanCode: 'weekly', activeSubscriptionId: 'sub-1', createdAt: '2026-01-10T12:00:00.000Z', stats: { rentalsCount: 3, totalSpentCents: 12000, openDisputes: 0 } });
  await override(page, mock, 'PUT', new RegExp('api\.mock\.local/payments/subscriptions/sub-1/vehicle'), (b: { vehicleId: string }) => ({ id: 'sub-1', status: 'active', planCode: 'weekly', assignedVehicle: { id: b.vehicleId, code: 'VLT-' + b.vehicleId.slice(-3) }, pausesRemainingInPeriod: 1 }));
  await page.goto('/customers?customer=cus-001');
  await expect(page.getByTestId('subscription-box')).toBeVisible();
  return mock;
}

test.describe('assinatura: moto fixa', () => {
  test('definir moto fixa: GET by-code em maiusculas, PUT com vehicleId, toast e caixa atualiza', async ({ page }) => {
    const mock = await openCustomerWithSub(page);
    await expect(page.getByTestId('fixed-vehicle')).toHaveText('Nenhuma');
    await page.getByTestId('assign-fixed').click();
    await expect(page.getByTestId('subscription-vehicle-save')).toBeDisabled();
    await page.getByTestId('subscription-vehicle-code').fill(' vlt-003 ');
    await s3(page, 'sub-dialog');
    await page.getByTestId('subscription-vehicle-save').click();
    await expect(page.getByText('Moto fixa definida: VLT-003')).toBeVisible();
    expect(calls(mock, /by-code\/VLT-003$/, 'GET')).toHaveLength(1);
    const put = calls(mock, /subscriptions\/sub-1\/vehicle$/, 'PUT');
    expect(put).toHaveLength(1);
    expect(put[0]!.body).toEqual({ vehicleId: 'veh-003' });
  });

  test('codigo inexistente (404) mostra erro no dialogo e nao chama o PUT', async ({ page }) => {
    const mock = await openCustomerWithSub(page);
    await page.getByTestId('assign-fixed').click();
    await page.getByTestId('subscription-vehicle-code').fill('XXX-9999');
    await page.getByTestId('subscription-vehicle-save').click();
    await expect(page.getByTestId('subscription-vehicle-dialog')).toContainText(/Não encontrado|encontrad/i);
    expect(calls(mock, /vehicle$/, 'PUT')).toHaveLength(0);
  });

  test('PUT com 409 (moto ja e fixa de outra assinatura) mostra mensagem do servidor e mantem o dialogo', async ({ page }) => {
    const mock = await openCustomerWithSub(page);
    await override(page, mock, 'PUT', /api\.mock\.local\/payments\/subscriptions\/sub-1\/vehicle/, { type: 'x', title: 'Moto já é fixa de outra assinatura', status: 409, detail: 'Moto já é fixa de outra assinatura' }, 409);
    await page.getByTestId('assign-fixed').click();
    await page.getByTestId('subscription-vehicle-code').fill('VLT-002');
    await page.getByTestId('subscription-vehicle-save').click();
    await expect(page.getByTestId('subscription-vehicle-dialog')).toContainText('Moto já é fixa de outra assinatura');
    await expect(page.getByText(/Moto fixa definida/)).toHaveCount(0);
  });

  test('duplo clique em Salvar chama o PUT uma vez', async ({ page }) => {
    const mock = await openCustomerWithSub(page);
    await page.getByTestId('assign-fixed').click();
    await page.getByTestId('subscription-vehicle-code').fill('VLT-004');
    await page.getByTestId('subscription-vehicle-save').dblclick();
    await page.waitForTimeout(700);
    expect(calls(mock, /vehicle$/, 'PUT').length).toBe(1);
  });

  test('suporte nao ve botao de definir moto fixa', async ({ page }) => {
    await openCustomerWithSub(page, 'suporte').catch(() => {});
    await expect(page.getByTestId('assign-fixed')).toHaveCount(0);
  });

  test('[BUG P3-15] Enter no campo de codigo confirma o dialogo (Modal sem <form>)', async ({ page }) => {
    const mock = await openCustomerWithSub(page);
    await page.getByTestId('assign-fixed').click();
    await page.getByTestId('subscription-vehicle-code').fill('VLT-005');
    await page.getByTestId('subscription-vehicle-code').press('Enter');
    await expect.poll(() => calls(mock, /vehicle$/, 'PUT').length, { message: 'Enter no unico campo do dialogo nao confirma' }).toBe(1);
  });
});

test.describe('lista de restricao', () => {
  async function openList(page: Page, group: 'admin' | 'suporte' | 'operacao' = 'admin') {
    const mock = await loginMocked(page, { group });
    await page.goto('/customers');
    await page.getByRole('button', { name: 'Lista de restrição' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    return mock;
  }

  test('lista vazia mostra estado vazio; adicionar CPF valida 11 digitos e motivo e envia so numeros', async ({ page }) => {
    const mock = await openList(page);
    const dlg = page.getByRole('dialog');
    await expect(dlg).toContainText('Nenhum CPF na lista.');
    const add = dlg.getByRole('button', { name: 'Adicionar' });
    await expect(add).toBeDisabled();
    await dlg.getByPlaceholder('Somente números').fill('529.982.247-25');
    await dlg.locator('input').nth(1).fill('Fraude comprovada');
    await expect(add).toBeEnabled();
    await add.click();
    await expect(page.getByText('CPF adicionado')).toBeVisible();
    expect(calls(mock, '/customer-restrictions')[0]!.body).toEqual({ cpf: '52998224725', reason: 'Fraude comprovada' });
    await expect(dlg).toContainText('Fraude comprovada');
    await s3(page, 'restrictions');
  });

  test('[BUG P3-11] CPF com digitos verificadores invalidos (111.111.111-11) e recusado antes de enviar', async ({ page }) => {
    const mock = await openList(page);
    const dlg = page.getByRole('dialog');
    await dlg.getByPlaceholder('Somente números').fill('11111111111');
    await dlg.locator('input').nth(1).fill('Teste de CPF');
    await expect(dlg).toContainText('CPF inválido');
    await expect(dlg.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    await dlg.getByPlaceholder('Somente números').fill('52998224726');
    await expect(dlg).toContainText('CPF inválido');
    await page.waitForTimeout(300);
    expect(calls(mock, '/customer-restrictions'), 'CPF 111.111.111-11 (invalido) foi enviado: a lista passa a ter uma entrada que nunca casa com ninguem').toHaveLength(0);
  });

  test('[BUG P3-12] remover CPF pede confirmacao (acao irreversivel que libera alguem barrado)', async ({ page }) => {
    const mock = await openList(page);
    await override(page, mock, 'GET', /api\.mock\.local\/customer-restrictions/, { items: [{ id: 'rs-9', cpf: '12345678901', reason: 'Fraude', createdAt: '2026-10-01T12:00:00.000Z' }] });
    await page.reload();
    await page.getByRole('button', { name: 'Lista de restrição' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remover' }).click();
    await page.waitForTimeout(500);
    expect(calls(mock, /customer-restrictions\/rs-9$/, 'DELETE'), 'um clique remove o CPF da lista sem confirmacao nem motivo').toHaveLength(0);
    await page.getByRole('dialog').filter({ hasText: 'Remover da lista de restrição' }).getByRole('button', { name: 'Remover CPF' }).click();
    await expect.poll(() => calls(mock, /customer-restrictions\/rs-9$/, 'DELETE').length).toBe(1);
  });

  test('suporte ve a lista mas nao tem o botao Remover', async ({ page }) => {
    const mock = await loginMocked(page, { group: 'suporte' });
    await override(page, mock, 'GET', /api\.mock\.local\/customer-restrictions/, { items: [{ id: 'rs-9', cpf: '12345678901', reason: 'Fraude', createdAt: '2026-10-01T12:00:00.000Z' }] });
    await page.goto('/customers');
    await page.getByRole('button', { name: 'Lista de restrição' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg).toContainText('Fraude');
    await expect(dlg.getByRole('button', { name: 'Remover' })).toHaveCount(0);
    await expect(dlg).not.toContainText('12345678901');
  });

  test('erro 409 (CPF ja na lista) aparece no dialogo', async ({ page }) => {
    const mock = await openList(page);
    await override(page, mock, 'POST', /api\.mock\.local\/customer-restrictions/, { type: 'x', title: 'CPF já está na lista', status: 409, detail: 'CPF já está na lista' }, 409);
    const dlg = page.getByRole('dialog');
    await dlg.getByPlaceholder('Somente números').fill('52998224725');
    await dlg.locator('input').nth(1).fill('Reincidente');
    await dlg.getByRole('button', { name: 'Adicionar' }).click();
    await expect(dlg).toContainText('CPF já está na lista');
  });
});

test.describe('auditoria: filtros', () => {
  test('filtros enviam action/entityType e intervalo de datas em UTC do dia inteiro; vazio mostra estado vazio', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/team');
    await page.getByRole('button', { name: 'Auditoria' }).click();
    await expect(page.getByTestId('audit-table').getByTestId('row').first()).toBeVisible();
    await page.getByPlaceholder('Ex.: vehicle.command').fill('vehicle.lock');
    await page.getByPlaceholder('Ex.: vehicle', { exact: true }).fill('vehicle');
    await page.locator('input[type=date]').nth(0).fill('2026-10-01');
    await page.locator('input[type=date]').nth(1).fill('2026-10-26');
    await expect.poll(() => mock.calls.some((c) => c.path === '/audit-logs' && c.query.get('action') === 'vehicle.lock' && c.query.get('entityType') === 'vehicle' && !!c.query.get('from') && !!c.query.get('to'))).toBe(true);
    const last = mock.calls.filter((c) => c.path === '/audit-logs').at(-1)!;
    expect(last.query.get('from')).toMatch(/^2026-10-01T0[0-9]:00:00/);
    expect(last.query.get('to')).toMatch(/^2026-10-2[67]T/);
    await s3(page, 'audit-filters');
  });

  test('intervalo invertido (De depois de Ate) avisa em vez de mostrar tabela vazia', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/team');
    await page.getByRole('button', { name: 'Auditoria' }).click();
    await page.locator('input[type=date]').nth(0).fill('2026-10-26');
    await page.locator('input[type=date]').nth(1).fill('2026-10-01');
    await page.waitForTimeout(600);
    await s3(page, 'audit-inverted');
    await expect(page.getByText(/data inicial|intervalo|anterior|inválid/i).first(), 'De > Ate nao gera aviso: o usuario so ve "Nenhum registro"').toBeVisible({ timeout: 2000 });
  });

  test('[BUG P3-14] filtros de texto sao debounced (nao disparam um GET por tecla)', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/team');
    await page.getByRole('button', { name: 'Auditoria' }).click();
    await expect(page.getByTestId('audit-table').getByTestId('row').first()).toBeVisible();
    const before = mock.calls.filter((c) => c.path === '/audit-logs').length;
    await page.getByPlaceholder('Ex.: vehicle.command').pressSequentially('vehicle.command', { delay: 30 });
    await page.waitForTimeout(800);
    const n = mock.calls.filter((c) => c.path === '/audit-logs').length - before;
    expect(n, `${n} requisicoes para 15 teclas`).toBeLessThanOrEqual(3);
  });

  test('Motivo e Entidade longos nao estouram a tabela', async ({ page }) => {
    const mock = await loginMocked(page);
    await override(page, mock, 'GET', /api\.mock\.local\/audit-logs/, { items: [{ id: 'au-1', action: 'vehicle.command.unlock.requested.by.operator', entityType: 'vehicle', entityId: 'veh-0000000000000000000000000000000001', actorType: 'staff', actorName: 'Maria Aparecida de Albuquerque e Souza', reason: 'Cliente ligou dizendo que a moto estava parada no meio da avenida e precisava ser liberada com urgência para não gerar multa de trânsito'.repeat(2), createdAt: '2026-10-26T12:00:00.000Z' }] });
    await page.goto('/team');
    await page.getByRole('button', { name: 'Auditoria' }).click();
    await expect(page.getByTestId('audit-table').getByTestId('row')).toHaveCount(1);
    await s3(page, 'audit-long');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
});
