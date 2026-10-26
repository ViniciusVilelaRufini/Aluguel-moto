import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { MOBILE, overflowReport } from '../helpers';
import { dshot, openVehicle } from './util';

test.use({ viewport: MOBILE, hasTouch: true });

const hOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** O elemento cabe na janela (nao e cortado a direita/esquerda) e seus botoes tem pelo menos 32px de altura. */
async function fits(page: Page, sel: string) {
  return page.locator(sel).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const small = Array.from(el.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[role=switch]'))
      .filter((b) => b.offsetParent !== null)
      .map((b) => ({ n: (b.getAttribute('aria-label') || b.textContent || b.tagName).trim().slice(0, 24), h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width) }))
      .filter((b) => b.h < 32 || b.w < 32);
    return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), vw: window.innerWidth, vh: window.innerHeight, small };
  });
}

test.describe('celular 390x844: fluxos profundos', () => {
  for (const path of ['/fleet', '/alerts', '/zones', '/customers', '/tasks', '/finance', '/settings', '/team']) {
    test(`${path}: sem rolagem horizontal da pagina nem elementos fora da tela`, async ({ page }) => {
      await loginMocked(page);
      await page.goto(path);
      await expect(page.locator('#main-content')).toBeVisible();
      await page.waitForTimeout(900);
      await dshot(page, `m-${path.slice(1)}`);
      expect(await hOverflow(page), 'rolagem horizontal').toBeLessThanOrEqual(1);
      expect(await overflowReport(page)).toEqual([]);
    });
  }

  test('[BUG P2-22] /settings: tabelas de precos cabem em 390px sem cortar colunas (ou rolam dentro do cartao com indicacao)', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/settings');
    await expect(page.getByLabel('Preço Por minuto')).toBeVisible();
    await page.waitForTimeout(500);
    const r = await page.getByLabel('Preço Por minuto').evaluate((el) => el.getBoundingClientRect().right);
    const clipped = await page.locator('.table-scroll').first().evaluate((el) => el.scrollWidth - el.clientWidth);
    await dshot(page, 'm-settings-table');
    expect(r, 'campo de preco do plano passa da borda direita da tela').toBeLessThanOrEqual(390);
    expect(clipped, 'tabela de planos exige rolar horizontalmente dentro do cartao: Ativo/Desbloqueio ficam escondidos').toBeLessThanOrEqual(1);
  });

  test('/settings em 390px: linha real de Cupons mostra os rotulos (Codigo, Desconto)', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/settings');
    const cell = page.locator('.stack-cells [data-testid="row"] td[data-label="Código"]').first();
    await expect(cell).toBeVisible();
    const label = await cell.evaluate((el) => getComputedStyle(el, '::before').content);
    expect(label).toContain('Código');
    await expect(page.locator('.stack-cells [data-testid="row"] td[data-label="Desconto"]').first()).toBeVisible();
  });

  test('/settings em 390px como financeiro: Modelos mostra Desbloqueio e Revisao e nao ha rolagem horizontal', async ({ page }) => {
    await loginMocked(page, { group: 'financeiro' });
    await page.goto('/settings');
    const row = page.getByTestId('models-table').getByTestId('row').first();
    await expect(row).toBeVisible();
    for (const l of ['Desbloqueio', 'Revisão']) {
      const cell = row.locator(`td[data-label="${l}"]`);
      await expect(cell).toBeVisible();
      expect(((await cell.innerText()) || '').trim().length).toBeGreaterThan(0);
    }
    await page.waitForTimeout(400);
    expect(await hOverflow(page)).toBeLessThanOrEqual(1);
    expect(await page.locator('.table-scroll').evaluateAll((els) => els.map((e) => e.scrollWidth - e.clientWidth).filter((d) => d > 1))).toEqual([]);
  });

  test('ficha da moto: abre inteira na tela e comandos ficam alcancaveis', async ({ page }) => {
    await loginMocked(page);
    await openVehicle(page, 'VLT-002');
    await page.waitForTimeout(600);
    const f = await fits(page, '[data-testid="vehicle-sheet"]');
    await dshot(page, 'm-vehicle-sheet');
    expect(f.left).toBeGreaterThanOrEqual(0);
    expect(f.right).toBeLessThanOrEqual(f.vw + 1);
    await page.getByTestId('cmd-lock').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('cmd-lock')).toBeVisible();
    expect(await hOverflow(page)).toBeLessThanOrEqual(1);
  });

  test('dialogo de comando cabe na tela e o botao Confirmar fica visivel', async ({ page }) => {
    await loginMocked(page);
    await openVehicle(page, 'VLT-002');
    await page.getByTestId('cmd-lock').scrollIntoViewIfNeeded();
    await page.getByTestId('cmd-lock').tap();
    await expect(page.getByTestId('command-dialog')).toBeVisible();
    const f = await fits(page, '[data-testid="command-dialog"]');
    await dshot(page, 'm-command-dialog');
    expect(f.left).toBeGreaterThanOrEqual(0);
    expect(f.right).toBeLessThanOrEqual(f.vw);
    expect(f.bottom).toBeLessThanOrEqual(f.vh);
    await expect(page.getByTestId('confirm-action')).toBeInViewport();
  });

  test('[BUG P2-23] alvos de toque: botao Sair e demais botoes/links tem pelo menos 24px (WCAG 2.5.8)', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.getByTestId('alerts-table').getByTestId('row').first()).toBeVisible();
    const small = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('button,a[href]'))
      .filter((b) => b.offsetParent !== null)
      .map((b) => { const r = b.getBoundingClientRect(); return { n: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 22), h: Math.round(r.height), w: Math.round(r.width) }; })
      .filter((b) => b.h < 24 || b.w < 24));
    expect(small, 'alvos menores que 24x24 px').toEqual([]);
  });

  test('menu lateral no celular: itens alcancaveis e navegacao funciona', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.getByTestId('alerts-table').getByTestId('row').first()).toBeVisible();
    // Abaixo de 640px o menu e uma gaveta aberta pelo botao do cabecalho (P3-16).
    await page.getByRole('button', { name: 'Abrir menu' }).tap();
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    const box = (await nav.boundingBox())!;
    await dshot(page, 'm-nav');
    expect(box.x + box.width).toBeLessThanOrEqual(391);
    await nav.getByRole('button', { name: /Clientes/ }).tap();
    await expect(page).toHaveURL(/customers/);
  });

  test('[BUG P2-24] modal de novo cupom em 390px: grade de 2 colunas nao estoura o dialogo', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Novo cupom' }).tap();
    await page.waitForTimeout(700);
    const f = await fits(page, '[role="dialog"]');
    await dshot(page, 'm-coupon-dialog');
    expect(f.right).toBeLessThanOrEqual(f.vw);
    const over = await page.getByRole('dialog').evaluate((d) => d.scrollWidth - d.clientWidth);
    expect(over).toBeLessThanOrEqual(1);
  });

  test('[BUG P2-25] titulo da secao no cabecalho nao fica truncado com reticencias', async ({ page }) => {
    await loginMocked(page);
    for (const p of ['/fleet', '/zones', '/settings', '/finance']) {
      await page.goto(p);
      await expect(page.locator('header h1')).toBeVisible();
      await page.waitForTimeout(300);
      const t = await page.locator('header h1').evaluate((el) => ({ txt: el.textContent, cut: el.scrollWidth - el.clientWidth }));
      expect(t.cut, `titulo "${t.txt}" cortado por reticencias em ${p}`).toBeLessThanOrEqual(0);
    }
  });

  test('[BUG P2-26] /fleet com moto selecionada: o pin selecionado nao fica escondido sob os KPIs/filtros', async ({ page }) => {
    await loginMocked(page);
    await openVehicle(page, 'VLT-002');
    await page.waitForTimeout(1200);
    await dshot(page, 'm-fleet-selected');
    const covered = await page.evaluate(() => {
      const el = document.querySelector('.map-pulse') as HTMLElement | null;
      if (!el) return 'sem pulso';
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) as HTMLElement | null;
      const hit = top?.closest('[data-testid="dashboard-strip"], [role="group"], .kpi-strip, button');
      return hit ? `coberto por ${hit.getAttribute('aria-label') ?? hit.getAttribute('data-testid') ?? hit.tagName}` : 'livre';
    });
    expect(covered).toBe('livre');
  });

  test('[BUG P2-27] /fleet: valor monetario do KPI "Receita do dia" nao e cortado com reticencias', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/fleet');
    await expect(page.getByTestId('dashboard-strip')).toBeVisible();
    await page.waitForTimeout(1200);
    const cut = await page.getByTestId('dashboard-strip').evaluate((el) => Array.from(el.querySelectorAll<HTMLElement>('*')).filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).textOverflow === 'ellipsis').map((e) => e.textContent));
    expect(cut, 'valores truncados nos KPIs').toEqual([]);
  });
});
