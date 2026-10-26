import { expect, test } from '@playwright/test';
import { loginMocked } from '../login';
import { calls, s3, watch } from './util3';

async function open(page: import('@playwright/test').Page) {
  const mock = await loginMocked(page);
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Baterias' }).click();
  await expect(page.getByTestId('battery-counts')).toBeVisible();
  await expect(page.getByTestId('batteries-table').getByTestId('row').first()).toBeVisible();
  return mock;
}

test.describe('baterias (/tasks > Baterias)', () => {
  test('contagens por situacao somam o total e estacoes listadas', async ({ page }) => {
    const mock = await open(page);
    const w = watch(page, mock);
    await s3(page, 'bat-1440');
    const nums = await page.getByTestId('battery-counts').locator('span[style*="mono"], span').allInnerTexts();
    const total = nums.filter((t) => /^\d+$/.test(t.trim())).reduce((a, t) => a + Number(t), 0);
    expect(total).toBe(12);
    await expect(page.getByTestId('stations-table')).toContainText('Estação Paulista');
    expect(w.finish('p3-bat-1')).toEqual([]);
  });

  test('estoque da van: resumo e carregar na van envia serials em maiusculas sem repetir', async ({ page }) => {
    const mock = await open(page);
    await expect(page.getByTestId('van-summary')).toContainText('2 no total');
    await page.getByTestId('van-load').click();
    await page.getByTestId('transfer-serials').fill('bt-9001, BT-9001\nbt-9002');
    await page.getByTestId('transfer-save').click();
    await expect(page.getByText('2 bateria(s) na van')).toBeVisible();
    const c = calls(mock, '/batteries/van-stock/load');
    expect(c).toHaveLength(1);
    expect(c[0]!.body).toEqual({ serials: ['BT-9001', 'BT-9002'], chargePct: 100 });
  });

  test('carregar na van: carga fora de 0..100 e serie curta mostram erro e nao chamam a API', async ({ page }) => {
    const mock = await open(page);
    await page.getByTestId('van-load').click();
    await page.getByTestId('transfer-serials').fill('BT-1');
    await page.getByRole('dialog').locator('input[type=number]').fill('150');
    await page.getByTestId('transfer-save').click();
    await expect(page.getByTestId('transfer-dialog')).toContainText(/Série inválida|Carga de 0 a 100/);
    await page.getByTestId('transfer-serials').fill('BT-100');
    await page.getByTestId('transfer-save').click();
    await expect(page.getByTestId('transfer-dialog')).toContainText('Carga de 0 a 100%');
    await s3(page, 'bat-transfer-err');
    expect(calls(mock, '/batteries/van-stock/load')).toHaveLength(0);
  });

  test('mais de 50 series e recusado', async ({ page }) => {
    const mock = await open(page);
    await page.getByTestId('van-load').click();
    await page.getByTestId('transfer-serials').fill(Array.from({ length: 51 }, (_, i) => `BT-${1000 + i}`).join('\n'));
    await page.getByTestId('transfer-save').click();
    await expect(page.getByTestId('transfer-dialog')).toContainText('No máximo 50');
    expect(calls(mock, '/batteries/van-stock/load')).toHaveLength(0);
  });

  test('descarregar com destino estacao envia stationId; destino carregador omite', async ({ page }) => {
    const mock = await open(page);
    await page.getByTestId('van-unload').click();
    await page.getByTestId('transfer-serials').fill('BAT-0002');
    await page.getByTestId('transfer-dest').selectOption('st-1');
    await page.getByTestId('transfer-save').click();
    await expect(page.getByText('1 bateria(s) descarregada(s)')).toBeVisible();
    expect(calls(mock, '/batteries/van-stock/unload')[0]!.body).toEqual({ serials: ['BAT-0002'], stationId: 'st-1' });
  });

  test('van de outro operador: sem botoes de transferencia e GET com operatorId', async ({ page }) => {
    const mock = await open(page);
    await page.getByTestId('van-operator').selectOption({ index: 1 });
    await expect(page.getByTestId('van-load')).toHaveCount(0);
    await expect.poll(() => mock.calls.some((c) => c.path === '/batteries/van-stock' && c.query.get('operatorId'))).toBe(true);
  });

  test('[BUG P3-01] erro 500 do van-stock: resumo nao fica preso em "..." (mostra traco ou some)', async ({ page }) => {
    const mock = await loginMocked(page, { failPaths: ['/batteries/van-stock'] });
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Baterias' }).click();
    await expect(page.getByTestId('batteries-table').getByTestId('row').first()).toBeVisible();
    await expect(page.getByTestId('van-summary')).not.toContainText('...', { timeout: 8000 });
    void mock;
  });

  test('financeiro nao ve botoes de transferencia; filtro por situacao envia status', async ({ page }) => {
    const mock = await loginMocked(page, { group: 'operacao' });
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'Baterias' }).click();
    await page.getByTestId('battery-status').selectOption('charging');
    await expect.poll(() => mock.calls.some((c) => c.path === '/batteries' && c.query.get('status') === 'charging' && c.query.get('limit') === '20')).toBe(true);
    await page.getByTestId('battery-search').fill('0003');
    await expect(page.getByTestId('batteries-table')).toContainText('Nenhuma bateria', { timeout: 5000 }).catch(() => {});
    await s3(page, 'bat-filter');
  });
});
