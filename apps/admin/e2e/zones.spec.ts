import { expect, test } from '@playwright/test';
import { drawPolygon, login } from './helpers';

test.describe('cercas', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/zones');
    await expect(page.getByTestId('draw-zone')).toBeEnabled();
  });

  test('cerca reduced_speed com limite 40 mostra "Máximo de 32 km/h" e com 25 mostra o limite de 20', async ({ page }) => {
    await page.getByTestId('draw-zone').click();
    await drawPolygon(page);
    await page.getByTestId('zone-name').fill('Teste limite');
    await page.getByTestId('zone-type').selectOption('reduced_speed');
    await page.getByTestId('zone-limit').fill('40');
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Máximo de 32 km/h')).toBeVisible();

    await page.getByTestId('zone-limit').fill('25');
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Máximo de 20 km/h em zona de velocidade reduzida')).toBeVisible();

    await page.getByTestId('zone-limit').fill('');
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Informe o limite de velocidade')).toBeVisible();
  });

  test('criar, editar e excluir uma cerca', async ({ page }) => {
    const name = `E2E cerca ${Date.now()}`;
    await page.getByTestId('draw-zone').click();
    await drawPolygon(page, 40);
    await expect(page.getByText('Polígono desenhado')).toBeVisible();
    await page.getByTestId('zone-name').fill(name);
    await page.getByTestId('zone-type').selectOption('reduced_speed');
    await page.getByTestId('zone-limit').fill('20');
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Cerca criada')).toBeVisible();
    const item = page.getByTestId('zone-item').filter({ hasText: name });
    await expect(item).toBeVisible();
    await expect(item).toContainText('20 km/h');

    // editar: renomeia e baixa o limite para 6 km/h (área de pedestres)
    await item.click();
    await expect(page.getByTestId('zone-form-title')).toHaveText('Editar cerca');
    await page.getByTestId('zone-name').fill(`${name} editada`);
    await page.getByTestId('zone-limit').fill('6');
    await page.getByTestId('zone-save').click();
    await expect(page.getByText('Cerca atualizada')).toBeVisible();
    const edited = page.getByTestId('zone-item').filter({ hasText: `${name} editada` });
    await expect(edited).toContainText('6 km/h');

    // excluir
    await edited.click();
    await page.getByTestId('zone-delete').click();
    await page.getByTestId('zone-delete-confirm').click();
    await expect(page.getByText('Cerca excluída')).toBeVisible();
    await expect(page.getByTestId('zone-item').filter({ hasText: name })).toHaveCount(0);
  });

  test('perfil suporte não vê o menu de cercas', async ({ page }) => {
    await page.getByTestId('logout').click();
    await login(page, 'suporte');
    await expect(page.getByRole('button', { name: 'Cercas e regras' })).toHaveCount(0);
  });
});
