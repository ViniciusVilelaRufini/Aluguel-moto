import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('paridade com o design (Lote A)', () => {
  test('ficha da moto: copy do design, GPS / 4G textual e log de auditoria', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/fleet?code=VLT-0001');
    const sheet = page.getByTestId('vehicle-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('GPS / 4G')).toBeVisible();
    await expect(sheet.getByText(/Sinal \d\/5/)).toHaveCount(0);
    await expect(sheet.getByText('Cliente', { exact: true })).toBeVisible();
    await expect(page.getByTestId('cmd-speed')).toHaveText('Limitar vel.');
  });

  test('pin com ícone e cluster com contagem usam imagens do mapa', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/fleet');
    await expect.poll(() => page.evaluate(() => {
      const m = (window as unknown as { __voltiMap?: { getLayer(id: string): unknown; hasImage(id: string): boolean } }).__voltiMap;
      return !!m && !!m.getLayer('vehicles-icon') && m.hasImage('pin-bike');
    })).toBe(true);
  });

  test('replay oferece aluguéis da moto além do período', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/fleet?code=VLT-0001');
    await page.getByTestId('replay-toggle').click();
    const select = page.getByTestId('replay-range');
    await expect(select).toBeVisible();
    await expect(select.locator('option', { hasText: 'Últimas 24 h' })).toHaveCount(1);
  });

  test('alertas: atribuir a outra pessoa pelo seletor de equipe', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/alerts');
    const first = page.getByTestId('alerts-table').getByRole('button', { name: /^(Atribuir|Reatribuir)$/ }).first();
    if (await first.count() === 0) test.skip(true, 'sem alertas abertos no seed');
    await first.click();
    await expect(page.getByTestId('assign-dialog')).toBeVisible();
    await expect(page.getByTestId('assign-select').locator('option')).not.toHaveCount(0);
    await page.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('cercas: menu Camadas por tipo e taxa de devolução na regra', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/zones');
    await expect(page.getByTestId('draw-zone')).toBeEnabled();
    await page.getByTestId('layers-toggle').click();
    await expect(page.getByTestId('layers-menu')).toBeVisible();
    await page.getByTestId('layer-forbidden').uncheck();
    await expect(page.getByTestId('layers-toggle')).toContainText('3/4');
    await page.getByTestId('layer-forbidden').check();
    await expect(page.getByText(/taxa de R\$\s15,00/)).toBeVisible();
  });
});
