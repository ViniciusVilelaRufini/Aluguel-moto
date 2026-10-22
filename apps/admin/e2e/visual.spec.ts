import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { login } from './helpers';

/**
 * Passada visual: abre cada seção e cada aba e verifica que renderiza sem erro.
 * Com `SHOTS_DIR` definido, salva capturas de tela (desktop 1440 e tablet 900) para revisão de design.
 */
const SHOTS = process.env.SHOTS_DIR;
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
};

const ROUTES: Record<string, string> = { Alertas: '/alerts/', 'Cercas e regras': '/zones/', Clientes: '/customers/', 'Operação': '/tasks/', Financeiro: '/finance/', 'Preços e planos': '/settings/', 'Equipe e acessos': '/team/' };
const nav = (page: Page, name: string) => ({ click: () => page.goto(ROUTES[name]) });

test.describe('passada visual', () => {
  test('login e 2FA', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-continue')).toBeVisible();
    await shot(page, '01-login');
    await page.getByTestId('login-continue').click();
    await expect(page.getByTestId('login-submit')).toBeVisible();
    await shot(page, '02-login-2fa');
  });

  for (const vp of [{ w: 1440, h: 900, tag: 'desktop' }, { w: 900, h: 1100, tag: 'tablet' }]) {
    test(`todas as seções (${vp.tag})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      await login(page, 'admin');
      const p = (n: string) => `${vp.tag}-${n}`;

      await expect(page.getByTestId('dashboard-strip')).toBeVisible();
      await page.waitForTimeout(1500);
      await shot(page, p('10-frota'));

      await page.goto('/fleet?code=VLT-0001');
      await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
      await shot(page, p('11-frota-ficha'));
      await page.getByTestId('cmd-lock').click();
      await expect(page.getByTestId('command-dialog')).toBeVisible();
      await shot(page, p('12-frota-comando'));
      await page.keyboard.press('Escape');
      if (await page.getByTestId('replay-toggle').isVisible()) {
        await page.getByTestId('replay-toggle').click();
        await expect(page.getByTestId('replay-bar')).toBeVisible();
        await page.waitForTimeout(800);
        await shot(page, p('13-frota-replay'));
      }

      await nav(page, 'Alertas').click();
      await expect(page.getByTestId('alerts-table')).toBeVisible();
      await shot(page, p('20-alertas'));

      await nav(page, 'Cercas e regras').click();
      await expect(page.getByTestId('zones-panel')).toBeVisible();
      await page.waitForTimeout(800);
      await shot(page, p('30-cercas'));
      await page.getByTestId('draw-zone').click();
      await shot(page, p('31-cercas-desenho'));

      await nav(page, 'Clientes').click();
      await expect(page.getByTestId('customers-table').getByTestId('row').first()).toBeVisible();
      await shot(page, p('40-clientes'));
      await page.getByTestId('customers-table').getByTestId('row').first().click();
      await expect(page.getByTestId('customer-sheet')).toBeVisible();
      await shot(page, p('41-clientes-ficha'));
      await page.getByRole('button', { name: 'Aluguéis', exact: true }).first().click();
      await expect(page.getByTestId('rentals-table')).toBeVisible();
      await shot(page, p('42-clientes-alugueis'));
      await page.getByRole('button', { name: 'Suporte', exact: true }).first().click();
      await shot(page, p('43-clientes-suporte'));

      await nav(page, 'Operação').click();
      await expect(page.getByText('Em andamento').first()).toBeVisible();
      await shot(page, p('50-operacao'));

      await nav(page, 'Financeiro').click();
      await expect(page.getByText('Receita líquida').first()).toBeVisible();
      await shot(page, p('60-financeiro'));

      await nav(page, 'Preços e planos').click();
      await expect(page.getByText('Cupons e indicação')).toBeVisible();
      await shot(page, p('70-precos'));

      await nav(page, 'Equipe e acessos').click();
      await expect(page.getByTestId('invite-staff')).toBeVisible();
      await shot(page, p('80-equipe'));
      await page.getByRole('button', { name: 'Auditoria' }).click();
      await expect(page.getByTestId('audit-table')).toBeVisible();
      await shot(page, p('81-auditoria'));
    });
  }
});
