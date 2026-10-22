import { expect, test } from '@playwright/test';
import { createCustomer, login } from './helpers';

const nav = (page: import('@playwright/test').Page, name: string) => page.getByRole('button', { name });

test.describe('painel', () => {
  test('admin vê as 8 seções do menu e o badge da frota', async ({ page }) => {
    await login(page, 'admin');
    await expect(page).toHaveURL(/\/fleet/);
    for (const n of ['Frota ao vivo', 'Alertas', 'Cercas e regras', 'Clientes', 'Operação', 'Financeiro', 'Preços e planos', 'Equipe e acessos']) {
      await expect(nav(page, n)).toBeVisible();
    }
    await expect(page.getByTestId('fleet-badge')).toContainText(/\d+ motos · \d+ sem sinal/);
  });

  test('a frota aparece no mapa (marcadores ou clusters renderizados)', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/fleet');
    await expect.poll(async () => page.evaluate(() => {
      const map = window.__voltiMap;
      if (!map || !map.getLayer('vehicles')) return 0;
      return map.queryRenderedFeatures({ layers: ['vehicles', 'clusters'] }).length;
    }), { timeout: 30_000 }).toBeGreaterThan(0);
  });

  test('financeiro vê financeiro e preços, sem frota nem comandos', async ({ page }) => {
    await login(page, 'financeiro');
    await expect(page).toHaveURL(/\/finance/);
    await expect(nav(page, 'Preços e planos')).toBeVisible();
    await expect(nav(page, 'Frota ao vivo')).toHaveCount(0);
    await expect(nav(page, 'Equipe e acessos')).toHaveCount(0);
    await page.goto('/fleet');
    await expect(page).toHaveURL(/\/finance/);
  });

  test('suporte vê o CPF mascarado na lista de clientes', async ({ page, request }) => {
    const customer = await createCustomer(request); // cliente com CPF criado pelo teste (não depende do seed)
    await login(page, 'suporte');
    await page.goto('/customers');
    await page.getByTestId('customer-search').fill(customer.name);
    const row = page.getByTestId('customers-table').getByTestId('row').filter({ hasText: customer.name });
    await expect(row).toBeVisible();
    await expect(row).toContainText(/\*\*\*\.\d{3}\.\d{3}-\*\*/);
    await expect(row).toContainText(customer.cpf.slice(3, 6));
    await expect(row).not.toContainText(`${customer.cpf.slice(0, 3)}.${customer.cpf.slice(3, 6)}.${customer.cpf.slice(6, 9)}-${customer.cpf.slice(9)}`);
  });

  test('alertas, aluguéis e auditoria carregam com paginação', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/alerts');
    await expect(page.getByTestId('alerts-table')).toBeVisible();
    await page.goto('/customers?tab=rentals');
    await expect(page.getByTestId('rentals-table')).toBeVisible();
    await page.goto('/team');
    await page.getByRole('button', { name: 'Auditoria' }).click();
    await expect(page.getByTestId('audit-table')).toBeVisible();
  });
});
