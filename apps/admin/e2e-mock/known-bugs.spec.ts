/**
 * REGRESSAO DE BUGS CONHECIDOS (achados do QA do painel, ver .superpowers/sdd/qa-painel/findings-1.md).
 * Cada teste descreve o comportamento CORRETO e FALHA hoje (bug aberto). Quando o bug for corrigido o teste passa.
 * Marcador: [BUG P1-xx] no titulo.
 */
import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from './login';
import { installMockApi } from './mock-api';
import { MOBILE } from './helpers';

const hOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const PANEL = ['/fleet', '/alerts', '/zones', '/customers', '/tasks', '/finance', '/settings', '/team'];

test.describe('[BUG] mobile 390x844', () => {
  test.use({ viewport: MOBILE });

  for (const path of PANEL) {
    test(`[BUG P1-01] ${path}: cabecalho nao causa rolagem horizontal`, async ({ page }) => {
      await loginMocked(page);
      await page.goto(path);
      await expect(page.locator('#main-content')).toBeVisible();
      await page.waitForTimeout(400);
      expect(await hOverflow(page), 'a pagina rola na horizontal (indicador "Ao vivo" estoura o cabecalho)').toBeLessThanOrEqual(1);
    });
  }

  test('[BUG P1-02] /login: formulario cabe na tela', async ({ page }) => {
    await installMockApi(page);
    await page.goto('/login');
    await expect(page.getByTestId('login-continue')).toBeVisible();
    const box = (await page.getByTestId('login-continue').boundingBox())!;
    expect(box.x + box.width, 'botao Continuar passa da borda direita').toBeLessThanOrEqual(MOBILE.width);
    expect(await hOverflow(page)).toBeLessThanOrEqual(1);
  });

  test('[BUG P1-07] /zones: titulo do cabecalho nao quebra em 3 linhas', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/zones');
    const h = await page.locator('header h1').evaluate((el) => el.getBoundingClientRect().height);
    expect(h, 'titulo "Cercas e regras" ocupa varias linhas no celular').toBeLessThanOrEqual(30);
  });

  test('[BUG P1-08] /fleet: cartoes de KPI nao cobrem a maior parte do mapa', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/fleet');
    await expect(page.getByTestId('fleet-badge')).toBeVisible();
    await page.waitForTimeout(600);
    const bottom = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('#main-content *')).filter((e) => /^(Ocupação|Alertas abertos)$/.test((e.textContent ?? '').trim()));
      return Math.max(...cards.map((e) => e.getBoundingClientRect().bottom));
    });
    expect(bottom, 'KPIs empilhados ocupam mais de 45% da altura util').toBeLessThanOrEqual(window_h(0.45));
  });
});
const window_h = (frac: number) => 844 * frac;

test('[BUG P1-03] /customers: Esc fecha a ficha do cliente', async ({ page }) => {
  await loginMocked(page);
  await page.goto('/customers');
  await page.getByTestId('customers-table').getByTestId('row').first().click();
  await expect(page.getByTestId('customer-sheet')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('customer-sheet')).toHaveCount(0);
});

test('[BUG P1-04] /customers?tab=rentals: Esc fecha o detalhe do aluguel', async ({ page }) => {
  await loginMocked(page);
  await page.goto('/customers?tab=rentals');
  await page.getByTestId('rentals-table').getByTestId('row').first().click();
  await expect(page.getByTestId('rental-detail')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('rental-detail')).toHaveCount(0);
});

test('[BUG P1-05] /customers: erro 500 nao mostra estado vazio junto e oferece tentar de novo', async ({ page }) => {
  await loginMocked(page, { failPaths: ['/customers'] });
  await page.goto('/customers');
  await expect(page.locator('#main-content [role="alert"]').first()).toBeVisible();
  await expect(page.getByText('Nenhum cliente nesta lista'), 'estado vazio contradiz a mensagem de erro').toHaveCount(0);
  await expect(page.locator('#main-content').getByRole('button', { name: /tentar novamente/i })).toBeVisible();
});

for (const path of ['/fleet', '/zones']) {
  test(`[BUG P1-06] ${path}: pagina tem um <h1>`, async ({ page }) => {
    await loginMocked(page);
    await page.goto(path);
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('#main-content h1, header h1')).toHaveCount(1);
  });
}

test('[BUG P1-09] /fleet: confirmar comando sem motivo anuncia UM unico alerta', async ({ page }) => {
  await loginMocked(page);
  await page.goto('/fleet');
  await expect(page.getByTestId('fleet-badge')).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByTestId('palette-input').fill('VLT-002');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('vehicle-sheet')).toBeVisible();
  await page.getByTestId('cmd-lock').click();
  await page.getByTestId('confirm-action').click();
  await expect(page.getByTestId('command-dialog').getByRole('alert')).toHaveCount(1);
});

test('[BUG P1-10] /finance: variacao zero nao aparece como "+R$ 0,00"/"+0%" com seta de alta ou baixa', async ({ page }) => {
  await loginMocked(page);
  await page.goto('/finance');
  await expect(page.getByText('Inadimplência', { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.getByText(/^\+R\$ 0,00$/)).toHaveCount(0);
  await expect(page.getByText(/^\+0% vs\./)).toHaveCount(0);
});

const TITLES: Record<string, string> = { '/fleet': 'Frota ao vivo', '/alerts': 'Alertas', '/zones': 'Cercas e regras', '/customers': 'Clientes', '/tasks': 'Operação', '/finance': 'Financeiro', '/settings': 'Preços e planos', '/team': 'Equipe e acessos' };
for (const path of PANEL) {
  test(`[BUG P1-11] ${path}: um unico <h1> e o titulo da secao aparece uma vez`, async ({ page }) => {
    await loginMocked(page);
    await page.goto(path);
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: TITLES[path], exact: true })).toBeVisible();
    // Rotulos de abas/botoes com o mesmo texto (ex.: aba "Clientes") nao contam como titulo.
    await expect(page.locator('main').getByText(TITLES[path], { exact: true }).filter({ visible: true }).filter({ hasNot: page.locator('xpath=self::*[ancestor-or-self::button or ancestor-or-self::*[@role="radio" or @role="tab"]]') }), 'titulo repetido').toHaveCount(1);
  });
}
