import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('login dev: senha e código de 6 dígitos', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByTestId('login-password')).toBeVisible();
  await page.getByTestId('login-continue').click();
  await expect(page.getByTestId('login-submit')).toBeDisabled();
  await page.getByLabel('Código de 6 dígitos').fill('12345');
  await expect(page.getByTestId('login-submit')).toBeDisabled();
  await page.getByLabel('Código de 6 dígitos').fill('123456');
  await expect(page.getByTestId('login-submit')).toBeEnabled();
});

test('financeiro: receita por moto e período anterior', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/finance/');
  await expect(page.getByText('Receita por moto (maiores do período)')).toBeVisible();
  await expect(page.getByText('Receita', { exact: true }).first()).toBeVisible();
});

test('clientes: Abrir chat leva ao suporte do cliente', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/customers/');
  await page.getByTestId('customers-table').getByRole('row').nth(1).click();
  await page.getByRole('button', { name: 'Atendimento' }).click();
  await page.getByTestId('open-chat').click();
  await expect(page.getByRole('button', { name: /Mostrar o atendimento de todos/ })).toBeVisible();
});

test('operação: Agendar por linha preenche a moto', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/tasks/');
  await page.getByRole('button', { name: 'Manutenção', exact: true }).click();
  const btn = page.getByRole('button', { name: 'Agendar', exact: true }).first();
  if (await btn.count() === 0) test.skip(true, 'sem manutenção no seed');
  await btn.click();
  await expect(page.getByLabel('Código da moto')).not.toHaveValue('');
});
