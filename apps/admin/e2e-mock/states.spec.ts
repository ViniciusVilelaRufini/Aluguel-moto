/**
 * Estados de carregamento e de erro: latencia alta (esqueleto/spinner visivel?) e API respondendo 500
 * (mensagem clara + como tentar de novo?). Capturas em __shots__/state-*.png.
 */
import { expect, test } from '@playwright/test';
import { loginMocked } from './login';
import { collect, shot } from './helpers';

const PAGES: { path: string; table: string; fail: string }[] = [
  { path: '/alerts', table: 'alerts-table', fail: '/alerts' },
  { path: '/customers', table: 'customers-table', fail: '/customers' },
  { path: '/team', table: 'team-table', fail: '/staff' },
];

for (const p of PAGES) {
  test(`${p.path}: estado de carregamento`, async ({ page }) => {
    const mock = await loginMocked(page, { latencyMs: 1500 });
    const c = collect(page, mock);
    await page.goto(p.path);
    await page.waitForTimeout(700);
    await shot(page, `state-loading-${p.path.slice(1)}`);
    await c.step('mostra indicador de carregamento (role=status) enquanto espera', async () => {
      await expect(page.locator('#main-content [role="status"]').first()).toBeAttached();
    });
    const issues = c.finish(`state-loading-${p.path.slice(1)}`);
    expect(issues, issues.join('\n')).toEqual([]);
  });

  test(`${p.path}: API com erro 500 mostra mensagem e permite tentar de novo`, async ({ page }) => {
    const mock = await loginMocked(page, { failPaths: [p.fail] });
    const c = collect(page, mock);
    await page.goto(p.path);
    await page.waitForTimeout(2500);
    await shot(page, `state-error-${p.path.slice(1)}`);
    await c.step('mostra erro (role=alert) no conteudo', async () => {
      await expect(page.locator('#main-content [role="alert"]').first()).toBeVisible();
    });
    await c.step('oferece "Tentar de novo"', async () => {
      await expect(page.locator('#main-content').getByRole('button', { name: /tentar de novo/i }).first()).toBeVisible();
    });
    const issues = c.finish(`state-error-${p.path.slice(1)}`);
    expect(issues, issues.join('\n')).toEqual([]);
  });
}

test('sessao expirada (401) volta para o login e nao entra em loop', async ({ page }) => {
  const mock = await loginMocked(page, { failPaths: [] });
  const c = collect(page, mock);
  await page.route('http://api.mock.local/alerts**', (r) => r.fulfill({ status: 401, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: '{"title":"expirada","status":401}' }));
  await page.goto('/alerts');
  await c.step('redireciona ao /login', async () => { await expect(page).toHaveURL(/\/login/, { timeout: 8000 }); });
  await shot(page, 'state-401-login');
  const issues = c.finish('state-401');
  expect(issues, issues.join('\n')).toEqual([]);
});
