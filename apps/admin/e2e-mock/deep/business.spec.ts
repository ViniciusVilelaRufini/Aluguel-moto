import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { calls, dshot, watch } from './util';

const cust = (page: Page, name: string) => page.getByTestId('customers-table').getByTestId('row').filter({ hasText: name });

test.describe('clientes: bloqueio e KYC', () => {
  test('bloquear conta: motivo obrigatorio, POST com addToRestrictionList=false, sheet reflete', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await page.goto('/customers');
    await cust(page, 'Cliente Teste 02').click();
    await expect(page.getByTestId('customer-sheet')).toBeVisible();
    await page.getByTestId('block-customer').click();
    await page.getByTestId('confirm-action').click();
    await expect(page.getByRole('dialog').getByText('Informe o motivo')).toBeVisible();
    expect(calls(mock, /block$/)).toHaveLength(0);
    await page.getByTestId('reason-input').fill('Documento falso');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByText('Conta bloqueada')).toBeVisible();
    const c = calls(mock, /block$/);
    expect(c).toHaveLength(1);
    expect(c[0]!.body).toEqual({ reason: 'Documento falso', addToRestrictionList: false });
    await expect(page.getByTestId('customer-sheet').getByRole('button', { name: 'Desbloquear conta' })).toBeVisible();
    await expect(cust(page, 'Cliente Teste 02')).toContainText('Bloqueada');
    expect(w.finish('cust-block')).toEqual([]);
  });

  test('bloquear e adicionar a lista de restricao envia addToRestrictionList=true', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/customers');
    await cust(page, 'Cliente Teste 03').click();
    await page.getByRole('button', { name: /Bloquear e adicionar/ }).click();
    await page.getByTestId('reason-input').fill('Fraude');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByText('Conta bloqueada')).toBeVisible();
    expect((calls(mock, /block$/)[0]!.body as { addToRestrictionList: boolean }).addToRestrictionList).toBe(true);
  });

  test('desbloquear conta bloqueada', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/customers');
    await page.getByRole('button', { name: 'Bloqueados' }).click();
    await expect(page.getByTestId('customers-table').getByTestId('row').first()).toBeVisible();
    await page.getByTestId('customers-table').getByTestId('row').first().click();
    await page.getByRole('button', { name: 'Desbloquear conta' }).click();
    await page.getByTestId('reason-input').fill('Regularizado');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByText('Conta desbloqueada')).toBeVisible();
    expect(calls(mock, /unblock$/)).toHaveLength(1);
  });

  test('KYC: aprovar cliente pendente envia decision=approved e some o botao', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/customers');
    await page.getByRole('button', { name: 'Pendentes' }).click();
    await expect(page.getByTestId('customers-table').getByTestId('row').first()).toBeVisible();
    await page.getByTestId('customers-table').getByTestId('row').first().click();
    await page.getByTestId('customer-sheet').getByRole('button', { name: 'Aprovar' }).click();
    await page.getByTestId('reason-input').fill('Documento conferido');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByText('Verificação registrada')).toBeVisible();
    expect((calls(mock, /kyc-review$/)[0]!.body as { decision: string }).decision).toBe('approved');
    await expect(page.getByTestId('customer-sheet').getByRole('button', { name: 'Aprovar' })).toHaveCount(0);
  });

  test('busca sem resultado mostra estado vazio com "Limpar busca e filtros"', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/customers');
    await page.getByTestId('customer-search').fill('zzzzzz');
    await expect(page.getByText('Nenhum cliente para "zzzzzz"')).toBeVisible();
    await page.getByRole('button', { name: 'Limpar busca e filtros' }).click();
    await expect(page.getByTestId('customers-table').getByTestId('row').first()).toBeVisible();
  });

  test('ficha do cliente: foco volta para a linha ao fechar com Esc', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/customers');
    const r = cust(page, 'Cliente Teste 02');
    await r.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('customer-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('customer-sheet')).toHaveCount(0);
    const tag = await page.evaluate(() => { const a = document.activeElement as HTMLElement; return a === document.body ? 'BODY' : `${a.tagName}:${a.getAttribute('data-testid') ?? ''}`; });
    expect(tag, 'o foco cai no <body> depois de fechar a ficha (teclado perde a posicao na lista)').not.toBe('BODY');
  });
});

test.describe('financeiro', () => {
  test('trocar periodo refaz as consultas com from/to coerentes e sem erros', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await page.goto('/finance');
    await expect(page.getByText('Inadimplência', { exact: true }).first()).toBeVisible();
    for (const [label, days] of [['Hoje', 0], ['30 dias', 29]] as const) {
      const n0 = mock.calls.filter((c) => c.path === '/reports/finance').length;
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect.poll(() => mock.calls.filter((c) => c.path === '/reports/finance').length, { message: `periodo ${label}` }).toBeGreaterThan(n0);
      const q = mock.calls.filter((c) => c.path === '/reports/finance').at(-2)!.query;
      const from = new Date(q.get('from')!).getTime();
      const to = new Date(q.get('to')!).getTime();
      const span = (to - from) / 86400000;
      expect(span, label).toBeGreaterThan(days);
      expect(span, label).toBeLessThan(days + 1.01);
    }
    await dshot(page, 'finance-period');
    expect(w.finish('finance-period')).toEqual([]);
  });

  test('exportar CSV: baixa arquivo com nome certo e format=csv na consulta', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.route('http://api.mock.local/reports/revenue?*format=csv*', (r) => r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/csv' }, body: 'periodo;liquido\n2026-10-01;100\n' }));
    await page.goto('/finance');
    await expect(page.getByTestId('export-revenue')).toBeVisible();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-revenue').click()]);
    // O nome leva o período exportado (receita-AAAA-MM-DD_a_AAAA-MM-DD.csv).
    expect(dl.suggestedFilename()).toMatch(/^receita-\d{4}-\d{2}-\d{2}_a_\d{4}-\d{2}-\d{2}\.csv$/);
    void mock;
  });

  test('exportar CSV com erro do servidor mostra toast de erro', async ({ page }) => {
    await loginMocked(page);
    await page.route('http://api.mock.local/reports/finance?*format=csv*', (r) => r.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{}' }));
    await page.goto('/finance');
    await page.getByRole('button', { name: 'Exportar resumo financeiro (CSV)' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /exportar/i })).toBeVisible();
  });

  test('[BUG P2-11] exportar CSV: clique duplo/lento nao dispara dois downloads e o botao mostra progresso', async ({ page }) => {
    await loginMocked(page);
    let hits = 0;
    await page.route('http://api.mock.local/reports/revenue?*format=csv*', async (r) => { hits++; await new Promise((x) => setTimeout(x, 600)); await r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'text/csv' }, body: 'a;b\n' }); });
    await page.goto('/finance');
    await expect(page.getByTestId('export-revenue')).toBeVisible();
    await page.getByTestId('export-revenue').dblclick();
    await page.waitForTimeout(1500);
    expect(hits, 'dois downloads do mesmo CSV com duplo clique').toBe(1);
  });

  test('valores em reais: KPIs usam R$ com virgula e a barra tem R$ mil', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/finance');
    await expect(page.getByText('R$ 6,6 mil')).toBeVisible();
    await expect(page.getByText('R$ 90,00').first()).toBeVisible();
  });
});

test.describe('precos e planos', () => {
  test('editar preco do plano em reais: PUT envia centavos inteiros', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/settings');
    const input = page.getByLabel('Preço Por minuto');
    await expect(input).toHaveValue('1,20');
    await input.fill('0,79');
    await page.getByTestId('save-settings').click();
    await expect(page.getByText('Preços salvos')).toBeVisible();
    const put = calls(mock, /pricing\/plans\//, 'PUT');
    expect(put).toHaveLength(1);
    expect((put[0]!.body as { unitPriceCents: number }).unitPriceCents).toBe(79);
  });

  test('valores com milhar e ponto ("1.234,50" e "0.79") viram centavos corretos', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/settings');
    await page.getByLabel('Preço Por hora').fill('1.234,50');
    await page.getByLabel('Preço Diária').fill('0.79');
    await page.getByTestId('save-settings').click();
    await expect(page.getByText('Preços salvos')).toBeVisible();
    const cents = calls(mock, /pricing\/plans\//, 'PUT').map((c) => (c.body as { code: string; unitPriceCents: number }));
    expect(cents.find((c) => c.code === 'hour')!.unitPriceCents).toBe(123450);
    expect(cents.find((c) => c.code === 'day')!.unitPriceCents).toBe(79);
  });

  test('valor invalido ("abc") nao grava nada e mostra mensagem em pt-BR', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/settings');
    await page.getByLabel('Preço Por minuto').fill('abc');
    await page.getByTestId('save-settings').click();
    await expect(page.getByText('Informe os valores em reais, por exemplo 0,79')).toBeVisible();
    expect(calls(mock, /pricing\//, 'PUT')).toHaveLength(0);
  });

  test('[BUG P2-12] campo de preco invalido e marcado (aria-invalid) no proprio campo, nao so em faixa distante', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/settings');
    const f = page.getByLabel('Preço Por minuto');
    await f.fill('abc');
    await page.getByTestId('save-settings').click();
    await page.waitForTimeout(300);
    await dshot(page, 'settings-invalid-money');
    expect(await f.getAttribute('aria-invalid'), 'nenhum indicio no campo de que "abc" e invalido (so um banner no topo)').toBe('true');
  });

  test('preco negativo: "-5" e recusado', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/settings');
    await page.getByLabel('Preço Por minuto').fill('-5');
    await page.getByTestId('save-settings').click();
    await page.waitForTimeout(500);
    expect(calls(mock, /pricing\//, 'PUT')).toHaveLength(0);
  });

  test('Descartar volta aos valores originais e desabilita Salvar', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/settings');
    await expect(page.getByTestId('save-settings')).toBeDisabled();
    await page.getByLabel('Preço Por minuto').fill('9,99');
    await expect(page.getByTestId('save-settings')).toBeEnabled();
    await page.getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByLabel('Preço Por minuto')).toHaveValue('1,20');
    await expect(page.getByTestId('save-settings')).toBeDisabled();
  });

  test('salvar parcial: uma falha mantem o item com erro editavel e informa o que foi salvo', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.route('http://api.mock.local/pricing/fees/*', (r) => r.request().method() === 'PUT' ? r.fulfill({ status: 500, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify({ type: 'x', title: 'Falha', status: 500 }) }) : r.fallback());
    await page.goto('/settings');
    await page.getByLabel('Preço Por minuto').fill('1,30');
    await page.getByLabel('Limpeza').fill('30,00');
    await page.getByTestId('save-settings').click();
    await expect(page.getByText(/Salvos: Plano Por minuto\. Não salvos: Taxa Limpeza/).first()).toBeVisible();
    await expect(page.getByLabel('Limpeza')).toHaveValue('30,00');
    await expect(page.getByLabel('Preço Por minuto')).toHaveValue('1,30');
    expect(calls(mock, /pricing\/plans\//, 'PUT')).toHaveLength(1);
  });

  test('[BUG P2-13] interruptores de Ativo (planos/cupons) tem nome acessivel', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/settings');
    await expect(page.getByRole('switch').first()).toBeVisible();
    const unnamed = await page.getByRole('switch').evaluateAll((els) => els.filter((e) => !(e.getAttribute('aria-label') || '').trim() && !(e.getAttribute('aria-labelledby'))).length);
    expect(unnamed, 'switches sem nome acessivel (aria-label vazio)').toBe(0);
  });

  test('cupom: validacoes de formulario', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Novo cupom' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.getByRole('button', { name: 'Criar cupom' })).toBeDisabled();
    await dlg.getByLabel('Código').fill('ab');
    await dlg.getByLabel('Percentual', { exact: true }).fill('15');
    await dlg.getByRole('button', { name: 'Criar cupom' }).click();
    await expect(dlg.getByText('Código com 3 a 32 letras')).toBeVisible();
    await dlg.getByLabel('Código').fill('NOVO15');
    await dlg.getByLabel('Percentual', { exact: true }).fill('150');
    await dlg.getByRole('button', { name: 'Criar cupom' }).click();
    await expect(dlg.getByText('inteiro de 1 a 100')).toBeVisible();
    await dlg.getByLabel('Percentual', { exact: true }).fill('15');
    await dlg.getByLabel('Válido de (opcional)').fill('2026-12-10');
    await dlg.getByLabel('Válido até (opcional)').fill('2026-12-01');
    await dlg.getByRole('button', { name: 'Criar cupom' }).click();
    await expect(dlg.getByText('termina antes de começar')).toBeVisible();
    expect(calls(mock, '/pricing/coupons')).toHaveLength(0);
    await dlg.getByLabel('Válido até (opcional)').fill('2026-12-31');
    await dlg.getByRole('button', { name: 'Criar cupom' }).click();
    await expect(page.getByText('Cupom criado')).toBeVisible();
    const b = calls(mock, '/pricing/coupons')[0]!.body as { code: string; percentOff: number; validUntil: string };
    expect(b.code).toBe('NOVO15');
    expect(b.percentOff).toBe(15);
    expect(b.validUntil).toBe('2027-01-01T02:59:59.999Z');
  });

  test('cupom de valor fixo: "7,50" vira 750 centavos', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Novo cupom' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Código').fill('FIXO');
    await dlg.locator('select').selectOption('fixed');
    await dlg.getByLabel('Valor (R$)').fill('7,50');
    await dlg.getByRole('button', { name: 'Criar cupom' }).click();
    await expect(page.getByText('Cupom criado')).toBeVisible();
    expect((calls(mock, '/pricing/coupons')[0]!.body as { amountOffCents: number }).amountOffCents).toBe(750);
  });

  test('[BUG P2-14] cupom de valor fixo aceita o mesmo formato de reais do restante ("1.234,50")', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Novo cupom' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Código').fill('GRANDE');
    await dlg.locator('select').selectOption('fixed');
    await dlg.getByLabel('Valor (R$)').fill('1.234,50');
    await dlg.getByRole('button', { name: 'Criar cupom' }).click();
    await page.waitForTimeout(600);
    const c = calls(mock, '/pricing/coupons');
    expect(c, 'o mesmo formato aceito nos precos ("1.234,50") e rejeitado no cupom').toHaveLength(1);
    expect((c[0]!.body as { amountOffCents: number }).amountOffCents).toBe(123450);
  });

  test('[BUG P2-15] duplo clique em "Criar cupom" cria um unico cupom', async ({ page }) => {
    const mock = await loginMocked(page, { latencyMs: 400 });
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Novo cupom' }).click();
    const dlg = page.getByRole('dialog');
    await dlg.getByLabel('Código').fill('DUPLO10');
    await dlg.getByLabel('Percentual', { exact: true }).fill('10');
    await dlg.getByRole('button', { name: 'Criar cupom' }).dblclick();
    await page.waitForTimeout(1800);
    expect(calls(mock, '/pricing/coupons')).toHaveLength(1);
  });

  test('alternar cupom e salvar envia o PUT com active invertido', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/settings');
    const sw = page.getByRole('switch').last();
    await expect(sw).toBeVisible();
    await sw.click();
    await page.getByTestId('save-settings').click();
    await expect(page.getByText('Preços salvos')).toBeVisible();
    expect(calls(mock, /pricing\/coupons\//, 'PUT')).toHaveLength(1);
  });
});
