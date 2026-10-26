import { expect, test, type Page } from '@playwright/test';
import { installMockApi } from '../mock-api';
import { MOBILE } from '../helpers';
import { hOverflow, s4, watch } from './util4';

async function toOtp(page: Page) {
  await page.getByTestId('login-continue').click();
  await page.getByLabel('Código de 6 dígitos').waitFor();
}

test.describe('login (modo dev)', () => {
  test('1440px: tela, foco inicial e teclado: Enter no passo 1 e no OTP entram no painel', async ({ page }) => {
    const mock = await installMockApi(page);
    const c = watch(page, mock);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    await s4(page, 'login-1440-step1');
    expect(await hOverflow(page)).toBeLessThanOrEqual(1);
    await page.getByTestId('login-password').focus();
    await page.keyboard.type('qualquer');
    await page.keyboard.press('Enter');
    await page.getByLabel('Código de 6 dígitos').waitFor();
    await s4(page, 'login-1440-otp');
    await page.keyboard.type('123456');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('logout')).toBeVisible({ timeout: 15_000 });
    expect(c.finish('deep4-login')).toEqual([]);
  });

  test('OTP incompleto mantem o botao desabilitado e Enter nao envia; Voltar limpa o codigo', async ({ page }) => {
    const mock = await installMockApi(page);
    await page.goto('/login');
    await toOtp(page);
    await page.getByLabel('Código de 6 dígitos').fill('123');
    await expect(page.getByTestId('login-submit')).toBeDisabled();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    expect(mock.calls.filter((x) => x.path === '/dev/token')).toHaveLength(0);
    await page.getByRole('button', { name: 'Voltar' }).click();
    await expect(page.getByTestId('login-continue')).toBeVisible();
    await toOtp(page);
    await expect(page.getByLabel('Código de 6 dígitos')).toHaveValue('');
  });

  test('carregando: botao mostra "Entrando..." e fica desabilitado; duplo Enter envia uma vez so', async ({ page }) => {
    const mock = await installMockApi(page, { latencyMs: 1200 });
    await page.goto('/login');
    await toOtp(page);
    await page.getByLabel('Código de 6 dígitos').fill('123456');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('login-submit')).toHaveText('Entrando...');
    await expect(page.getByTestId('login-submit')).toBeDisabled();
    await s4(page, 'login-loading');
    await expect(page.getByTestId('logout')).toBeVisible({ timeout: 15_000 });
    expect(mock.calls.filter((x) => x.path === '/dev/token')).toHaveLength(1);
  });

  test('erro 500 em /dev/token: mensagem em pt-BR, role=alert, botao volta e permite nova tentativa', async ({ page }) => {
    const mock = await installMockApi(page, { failPaths: ['/dev/token'] });
    await page.goto('/login');
    await toOtp(page);
    await page.getByLabel('Código de 6 dígitos').fill('123456');
    await page.getByTestId('login-submit').click();
    const err = page.getByText('Falha simulada');
    await expect(err).toBeVisible();
    const txt = await err.innerText();
    console.log(`[deep4] erro 500 mostrado: "${txt}"`);
    await s4(page, 'login-error-500');
    expect(txt).not.toMatch(/undefined|\[object|TypeError/i);
    await expect(page.getByTestId('login-submit')).toBeEnabled();
    await page.getByTestId('login-submit').click();
    await expect.poll(() => mock.calls.filter((x) => x.path === '/dev/token').length).toBe(2);
  });

  test('[BUG P4-02] senha vazia: Continuar deveria exigir a senha (hoje avanca sem validar)', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/login');
    await page.getByTestId('login-continue').click();
    await page.waitForTimeout(300);
    await s4(page, 'p4-02-empty-password');
    await expect(page.getByLabel('Código de 6 dígitos')).toHaveCount(0, { timeout: 1000 });
    await expect(page.getByText(/obrigat|informe a senha|digite a senha/i)).toBeVisible();
  });

  test('[BUG P4-03] campo E-mail parece editavel mas ignora a digitacao (onChange vazio, sem readonly)', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/login');
    const email = page.getByLabel('E-mail');
    const before = await email.inputValue();
    await email.click();
    await page.keyboard.type('outro@x.com');
    const after = await email.inputValue();
    const ro = await email.evaluate((e: HTMLInputElement) => e.readOnly || e.disabled);
    await s4(page, 'p4-03-email-ignored');
    expect(after !== before || ro, `email ${before} -> ${after}, readonly=${ro}`).toBe(true);
  });

  test('[BUG P4-04] erro de login antigo nao reaparece ao voltar e reabrir o passo do codigo', async ({ page }) => {
    await installMockApi(page, { failPaths: ['/dev/token'] });
    await page.goto('/login');
    await toOtp(page);
    await page.getByLabel('Código de 6 dígitos').fill('123456');
    await page.getByTestId('login-submit').click();
    await expect(page.getByText('Falha simulada')).toBeVisible();
    await page.getByRole('button', { name: 'Voltar' }).click();
    await toOtp(page);
    await expect(page.getByText('Falha simulada')).toHaveCount(0);
  });

  test.describe('390px', () => {
    test('passo 1, OTP e erro cabem na tela sem rolagem horizontal; botao >= 44px', async ({ page }) => {
      await page.setViewportSize(MOBILE);
      const mock = await installMockApi(page, { failPaths: ['/dev/token'] });
      const c = watch(page, mock);
      await page.goto('/login');
      await s4(page, 'login-390-step1');
      expect(await hOverflow(page)).toBeLessThanOrEqual(1);
      const h1 = await page.getByTestId('login-continue').evaluate((e) => e.getBoundingClientRect().height);
      expect(h1).toBeGreaterThanOrEqual(44);
      await toOtp(page);
      await page.getByLabel('Código de 6 dígitos').fill('123456');
      await page.getByTestId('login-submit').click();
      await expect(page.getByText('Falha simulada')).toBeVisible();
      await s4(page, 'login-390-error');
      expect(await hOverflow(page)).toBeLessThanOrEqual(1);
      const right = await page.getByLabel('Código de 6 dígitos').evaluate((e) => e.getBoundingClientRect().right);
      expect(right).toBeLessThanOrEqual(390);
      expect(c.finish('deep4-login-390')).toEqual([]);
    });

    test('390px: formulario (botao Continuar) deve aparecer na primeira dobra', async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await installMockApi(page);
      await page.goto('/login');
      const bottom = await page.getByTestId('login-continue').evaluate((e) => e.getBoundingClientRect().bottom);
      await s4(page, 'p4-05-login-390-fold');
      expect(bottom, 'botao Continuar abaixo da dobra (844px)').toBeLessThan(844);
    });
  });
});
