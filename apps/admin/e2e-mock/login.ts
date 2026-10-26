import { expect, type Page } from '@playwright/test';
import { installMockApi, type Mock, type MockOptions } from './mock-api';

const TOKEN_KEY = 'volti.admin.token';

/**
 * Entra como equipe sem credencial real: instala a API mockada, grava o token dev na sessionStorage
 * (o painel o guarda la, ver src/lib/token-store.ts) e o /me mockado devolve o perfil do grupo.
 * Chame ANTES do primeiro page.goto.
 */
export async function loginMocked(page: Page, opts: MockOptions = {}): Promise<Mock> {
  const mock = await installMockApi(page, opts);
  const group = opts.group ?? 'admin';
  await page.addInitScript(([k, v]) => { try { window.sessionStorage.setItem(k!, v!); } catch { /* ignore */ } }, [TOKEN_KEY, `mock.dev-${group}.token`]);
  return mock;
}

/** Login pela interface (fluxo de /login em modo dev), com a API mockada. */
export async function loginViaUi(page: Page, opts: MockOptions = {}): Promise<Mock> {
  const mock = await installMockApi(page, opts);
  await page.goto('/login');
  await page.getByTestId('login-continue').click();
  await page.getByLabel('Código de 6 dígitos').fill('123456');
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('logout')).toBeVisible();
  return mock;
}
