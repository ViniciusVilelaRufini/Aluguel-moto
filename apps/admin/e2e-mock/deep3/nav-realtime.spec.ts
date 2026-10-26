import { expect, test } from '@playwright/test';
import { loginMocked } from '../login';
import { MOBILE } from '../helpers';
import { s3 } from './util3';
import { installControllableSocket } from './fixtures3';

test.describe('menu lateral em 390px', () => {
  test.use({ viewport: MOBILE, hasTouch: true });

  test('trilho de icones: nao cobre o conteudo e nao causa rolagem horizontal', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.locator('#main-content')).toBeVisible();
    const m = await page.evaluate(() => {
      const nav = document.querySelector('.shell-nav')!.getBoundingClientRect();
      const main = document.querySelector('#main-content')!.getBoundingClientRect();
      return { navW: Math.round(nav.width), navRight: Math.round(nav.right), mainLeft: Math.round(main.left), mainW: Math.round(main.width), de: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    await s3(page, 'nav-390');
    expect(m.mainLeft).toBeGreaterThanOrEqual(m.navRight);
    expect(m.de).toBeLessThanOrEqual(1);
  });

  test('[BUG P3-16] ha como recolher o menu em celular (botao menu/hamburguer) para devolver 68 px ao conteudo', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.locator('#main-content')).toBeVisible();
    const toggle = page.getByRole('button', { name: /menu|recolher|abrir menu|navegação/i });
    expect(await toggle.count(), 'nenhum botao para recolher/abrir o menu: o trilho de 68px fica sempre aberto e o conteudo tem so 322px').toBeGreaterThan(0);
  });

  test('itens do menu tem alvo de toque >= 40px e nome acessivel', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.locator('.shell-nav button').first()).toBeVisible();
    const small = await page.locator('.shell-nav button').evaluateAll((els) => els.map((e) => ({ n: e.getAttribute('aria-label') ?? '', w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) })).filter((b) => b.w < 40 || b.h < 40 || !b.n));
    expect(small).toEqual([]);
  });

  test('rodape do trilho (avatar + sair) cabe nos 68px', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/alerts');
    await expect(page.getByTestId('logout')).toBeVisible();
    const r = await page.evaluate(() => { const nav = document.querySelector('.shell-nav')!.getBoundingClientRect(); const f = document.querySelector('.nav-footer')!.getBoundingClientRect(); const l = document.querySelector('[data-testid=logout]')!.getBoundingClientRect(); return { navR: nav.right, fR: f.right, lR: l.right, lW: l.width, lH: l.height }; });
    expect(r.fR).toBeLessThanOrEqual(r.navR + 1);
    expect(r.lR).toBeLessThanOrEqual(r.navR + 1);
    expect(Math.min(r.lW, r.lH), 'botao Sair pequeno demais para toque').toBeGreaterThanOrEqual(32);
  });

  test('titulo da pagina e indicador "Ao vivo" cabem no cabecalho sem sobrepor a paleta', async ({ page }) => {
    await loginMocked(page);
    await page.goto('/customers');
    await expect(page.getByTestId('live-indicator')).toBeVisible();
    const r = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      const t = box('.shell-title'); const l = box('[data-testid=live-indicator]'); const h = box('.shell-header');
      return { tR: t.right, lL: l.left, lR: l.right, hR: h.right, tW: t.width };
    });
    await s3(page, 'header-390');
    expect(r.tR).toBeLessThanOrEqual(r.lL + 1);
    expect(r.lR).toBeLessThanOrEqual(r.hR + 1);
  });
});

test.describe('tempo real: reconexao do socket', () => {
  test('derrubar o websocket mostra "Reconectando", o painel segue usavel e volta "Ao vivo" sozinho', async ({ page }) => {
    await loginMocked(page);
    const ctl = await installControllableSocket(page);
    await page.goto('/fleet');
    const ind = page.getByTestId('live-indicator');
    await expect(ind).toHaveAttribute('data-connected', 'true', { timeout: 10_000 });
    await ctl.drop();
    await expect(ind).toHaveAttribute('data-connected', 'false', { timeout: 10_000 });
    await expect(ind).toContainText('Reconectando');
    await s3(page, 'socket-dropped');
    await page.keyboard.press('Control+k');
    await expect(page.getByTestId('palette-input')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(ind).toHaveAttribute('data-connected', 'true', { timeout: 20_000 });
    expect(ctl.connections).toBeGreaterThanOrEqual(2);
  });

  test('evento emitido apos a reconexao ainda chega (toast de alerta critico em /customers)', async ({ page }) => {
    await loginMocked(page);
    const ctl = await installControllableSocket(page);
    await page.goto('/customers');
    const ind = page.getByTestId('live-indicator');
    await expect(ind).toHaveAttribute('data-connected', 'true', { timeout: 10_000 });
    await ctl.drop();
    await expect(ind).toHaveAttribute('data-connected', 'false', { timeout: 10_000 });
    await expect(ind).toHaveAttribute('data-connected', 'true', { timeout: 20_000 });
    ctl.emit('alert.created', { id: 'al-new', type: 'theft_suspected', priority: 'critical', status: 'open', vehicleId: 'veh-001', createdAt: '2026-10-26T15:00:00.000Z' });
    await expect(page.getByText(/Alerta crítico/)).toBeVisible({ timeout: 5000 });
  });

  test('apos a queda, os dados sao revalidados na reconexao (GET /vehicles e /alerts de novo)', async ({ page }) => {
    const mock = await loginMocked(page);
    const ctl = await installControllableSocket(page);
    await page.goto('/fleet');
    const ind = page.getByTestId('live-indicator');
    await expect(ind).toHaveAttribute('data-connected', 'true', { timeout: 10_000 });
    await page.waitForTimeout(500);
    const count = () => mock.calls.filter((c) => c.path === '/vehicles' || c.path === '/alerts').length;
    const before = count();
    await ctl.drop();
    await expect(ind).toHaveAttribute('data-connected', 'false', { timeout: 10_000 });
    await expect(ind).toHaveAttribute('data-connected', 'true', { timeout: 20_000 });
    await page.waitForTimeout(800);
    expect(count() - before, 'eventos perdidos durante a queda: sem GET /vehicles e /alerts apos reconectar a frota fica velha ate o proximo refetch').toBeGreaterThan(0);
  });

  test('socket que nunca conecta: painel usavel, Reconectando e sem rajada de requisicoes', async ({ page }) => {
    const mock = await loginMocked(page);
    const ctl = await installControllableSocket(page);
    ctl.refuse = true;
    await page.goto('/zones');
    await expect(page.getByTestId('live-indicator')).toHaveAttribute('data-connected', 'false');
    await page.waitForTimeout(6000);
    expect(ctl.connections, 'tentativas de reconexao em 6s').toBeLessThanOrEqual(8);
    expect(mock.calls.filter((c) => c.path === '/vehicles').length).toBeLessThanOrEqual(4);
  });
});
