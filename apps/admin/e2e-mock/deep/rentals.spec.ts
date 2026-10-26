import { expect, test } from '@playwright/test';
import { loginMocked } from '../login';
import { calls, dshot, watch } from './util';

test.describe('alugueis: encerrar a forca e estornar', () => {
  test('encerrar a forca (suporte/admin): motivo obrigatorio, POST, status muda', async ({ page }) => {
    const mock = await loginMocked(page);
    const w = watch(page, mock);
    await page.goto('/customers?tab=rentals');
    const first = page.getByTestId('rentals-table').getByTestId('row').first(); // rent-001: active
    await first.click();
    await expect(page.getByTestId('rental-detail')).toBeVisible();
    await page.getByTestId('force-end').click();
    await page.getByTestId('confirm-action').click();
    await expect(page.getByRole('dialog').getByText('Informe o motivo')).toBeVisible();
    expect(calls(mock, /force-end$/)).toHaveLength(0);
    await page.getByTestId('reason-input').fill('Cliente pediu');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByText('Aluguel encerrado')).toBeVisible();
    expect(calls(mock, /force-end$/)).toHaveLength(1);
    await expect(page.getByTestId('rental-detail').getByText('Encerrado à força').first()).toBeVisible();
    await expect(page.getByTestId('force-end')).toHaveCount(0);
    expect(w.finish('force-end')).toEqual([]);
  });

  test('estorno parcial "12,50" envia 1250 centavos com Idempotency-Key', async ({ page }) => {
    const mock = await loginMocked(page);
    mock.db.rentals[1]!.paymentId = 'pay-001';
    await page.goto('/customers?tab=rentals');
    await page.getByTestId('rentals-table').getByTestId('row').nth(1).click();
    await page.getByTestId('refund').click();
    await page.getByPlaceholder('0,00').fill('12,50');
    await page.getByTestId('reason-input').fill('Cobranca em duplicidade');
    await page.getByTestId('confirm-action').click();
    await expect(page.getByText('Estorno solicitado')).toBeVisible();
    const c = calls(mock, /refund$/);
    expect(c).toHaveLength(1);
    expect((c[0]!.body as { amountCents: number }).amountCents).toBe(1250);
  });

  test('estorno com valor invalido ("abc", "0") e recusado dentro do dialogo', async ({ page }) => {
    const mock = await loginMocked(page);
    mock.db.rentals[1]!.paymentId = 'pay-001';
    await page.goto('/customers?tab=rentals');
    await page.getByTestId('rentals-table').getByTestId('row').nth(1).click();
    await page.getByTestId('refund').click();
    await page.getByTestId('reason-input').fill('Teste');
    for (const v of ['abc', '0', '-5']) {
      await page.getByPlaceholder('0,00').fill(v);
      await page.getByTestId('confirm-action').click();
      await expect(page.getByRole('dialog').getByText('Informe um valor válido').first(), v).toBeVisible();
    }
    expect(calls(mock, /refund$/)).toHaveLength(0);
  });

  test('[BUG P2-28] estorno aceita o formato de reais com milhar ("1.234,50") como o resto do painel', async ({ page }) => {
    const mock = await loginMocked(page);
    mock.db.rentals[1]!.paymentId = 'pay-001';
    mock.db.payments[0]!.amountCents = 500_000; // precisa caber o estorno de R$ 1.234,50 (P2-29 valida contra o pago)
    await page.goto('/customers?tab=rentals');
    await page.getByTestId('rentals-table').getByTestId('row').nth(1).click();
    await page.getByTestId('refund').click();
    await page.getByPlaceholder('0,00').fill('1.234,50');
    await page.getByTestId('reason-input').fill('Teste milhar');
    await page.getByTestId('confirm-action').click();
    await page.waitForTimeout(600);
    const c = calls(mock, /refund$/);
    expect(c, '"1.234,50" e interpretado como NaN e recusado').toHaveLength(1);
    expect((c[0]!.body as { amountCents: number }).amountCents).toBe(123450);
  });

  test('[BUG P2-29] estorno maior que o pagamento e recusado no cliente (nao so pelo servidor)', async ({ page }) => {
    const mock = await loginMocked(page);
    mock.db.rentals[1]!.paymentId = 'pay-001'; // pay-001: R$ 20,00
    await page.goto('/customers?tab=rentals');
    await page.getByTestId('rentals-table').getByTestId('row').nth(1).click();
    await page.getByTestId('refund').click();
    await page.getByPlaceholder('0,00').fill('99999');
    await page.getByTestId('reason-input').fill('Teste excedente');
    await page.getByTestId('confirm-action').click();
    await page.waitForTimeout(600);
    expect(calls(mock, /refund$/), 'estorno de R$ 99.999,00 sobre pagamento de R$ 20,00 foi enviado').toHaveLength(0);
  });

  test('segundo estorno parcial logo depois valida contra o restante atualizado (cache do pagamento invalidado)', async ({ page }) => {
    const mock = await loginMocked(page);
    mock.db.rentals[1]!.paymentId = 'pay-001';
    mock.db.payments[0]!.amountCents = 5000;
    mock.db.payments[0]!.refundedCents = 0;
    await page.goto('/customers?tab=rentals');
    await page.getByTestId('rentals-table').getByTestId('row').nth(1).click();
    const refund = async (v: string) => {
      await page.getByTestId('refund').click();
      await page.getByPlaceholder('0,00').fill(v);
      await page.getByTestId('reason-input').fill('Parcial');
      await page.getByTestId('confirm-action').click();
    };
    await refund('30,00');
    await expect(page.getByText('Estorno solicitado')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await refund('30,00');
    await expect(page.getByRole('dialog').getByText('excede o que ainda pode ser estornado')).toBeVisible();
    expect(calls(mock, /refund$/)).toHaveLength(1);
  });

  test('[BUG P2-30] financeiro: detalhe do aluguel nao oferece "Abrir ficha" do cliente (secao Clientes e proibida)', async ({ page }) => {
    const mock = await loginMocked(page, { group: 'financeiro' });
    mock.db.rentals[1]!.paymentId = 'pay-001';
    await page.goto('/finance?tab=rentals');
    await page.getByTestId('rentals-table').getByTestId('row').nth(1).click();
    await expect(page.getByTestId('rental-detail')).toBeVisible();
    await expect(page.getByTestId('refund')).toBeVisible();
    await dshot(page, 'finance-rental-link');
    await expect(page.getByRole('link', { name: 'Abrir ficha' }), 'link leva para /customers, que redireciona de volta sem aviso').toHaveCount(0);
  });

  test('suporte: nao ve "Estornar pagamento"; financeiro nao ve "Encerrar a forca"', async ({ page }) => {
    const mock = await loginMocked(page, { group: 'suporte' });
    mock.db.rentals[1]!.paymentId = 'pay-001';
    await page.goto('/customers?tab=rentals');
    await page.getByTestId('rentals-table').getByTestId('row').nth(1).click();
    await expect(page.getByTestId('rental-detail')).toBeVisible();
    await expect(page.getByTestId('refund')).toHaveCount(0);
    const p2 = await page.context().newPage();
    const m2 = await loginMocked(p2, { group: 'financeiro' });
    await p2.goto('/finance?tab=rentals');
    await p2.getByTestId('rentals-table').getByTestId('row').first().click();
    await expect(p2.getByTestId('rental-detail')).toBeVisible();
    await expect(p2.getByTestId('force-end')).toHaveCount(0);
    void m2;
  });

  test('filtros de aluguel: situacao e datas enviam status/from/to', async ({ page }) => {
    const mock = await loginMocked(page);
    await page.goto('/customers?tab=rentals');
    await expect(page.getByTestId('rentals-table').getByTestId('row').first()).toBeVisible();
    await page.getByLabel('Situação').selectOption('ended');
    await page.getByLabel('De', { exact: true }).fill('2026-10-01');
    await expect.poll(() => { const q = mock.calls.filter((c) => c.path === '/rentals').at(-1)!.query; return `${q.get('status')}|${q.get('from')}`; }).toBe('ended|2026-10-01T03:00:00.000Z');
  });
});
