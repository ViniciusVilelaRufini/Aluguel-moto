import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe('paleta de comandos e atalhos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
  });

  test('Ctrl+K abre, código exato abre a ficha da moto e Esc fecha a ficha', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const input = page.getByTestId('palette-input');
    await expect(input).toBeFocused();
    await input.fill('VLT-0001');
    await expect(page.getByTestId('palette-option').first()).toContainText('VLT-0001');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('command-palette')).toHaveCount(0);
    await expect(page.getByTestId('vehicle-code')).toHaveText('VLT-0001');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('vehicle-sheet')).toHaveCount(0);
  });

  test('"/" abre a paleta; setas e Enter levam à seção; texto livre busca clientes', async ({ page }) => {
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('/');
    const input = page.getByTestId('palette-input');
    await input.fill('financeiro');
    const option = page.getByRole('option', { name: /^Financeiro/ });
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(option).toHaveAttribute('aria-selected', 'false');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/finance/);

    await page.getByRole('button', { name: 'Buscar moto, cliente ou aluguel' }).first().click();
    await page.getByTestId('palette-input').fill('Maria');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/customers\/?\?q=Maria/);
    await expect(page.getByTestId('customer-search')).toHaveValue('Maria');
  });

  test('diálogo de comando prende o foco e devolve ao botão ao fechar', async ({ page }) => {
    await page.goto('/fleet?code=VLT-0001');
    await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
    await page.getByTestId('cmd-horn').click();
    await expect(page.getByTestId('reason-input')).toBeFocused();
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect(inside).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('command-dialog')).toHaveCount(0);
    await expect(page.getByTestId('cmd-horn')).toBeFocused();
    // Esc no diálogo não fecha a ficha junto.
    await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
  });
});
