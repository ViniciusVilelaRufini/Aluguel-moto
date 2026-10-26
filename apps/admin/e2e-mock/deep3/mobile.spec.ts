import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { MOBILE } from '../helpers';
import { override, disputes3, claims3, messages3 } from './fixtures3';
import { s3 } from './util3';

test.use({ viewport: MOBILE, hasTouch: true });

async function boot(page: Page, path: string) {
  const mock = await loginMocked(page);
  await override(page, mock, 'GET', /api\.mock\.local\/support\/disputes(\?|$)/, { items: disputes3 });
  await override(page, mock, 'GET', /api\.mock\.local\/support\/claims(\?|$)/, { items: claims3 });
  await override(page, mock, 'GET', /api\.mock\.local\/support\/conversations\/[^/]+\/messages/, { items: messages3 });
  await page.goto(path);
  await expect(page.locator('#main-content')).toBeVisible();
  await page.waitForTimeout(900);
  return mock;
}

test.describe('390px: suporte', () => {
  test('[BUG P3-18] conversa aberta: o painel de mensagens tem largura legivel (>= 240px) ou empilha abaixo da lista', async ({ page }) => {
    await boot(page, '/customers?tab=support');
    await s3(page, 'm-support-list');
    const w = await page.getByText('Selecione uma conversa.').evaluate((el) => { const r = (el.parentElement as HTMLElement).getBoundingClientRect(); return { w: Math.round(r.width), left: Math.round(r.left), vw: window.innerWidth }; });
    expect(w.w, `painel de mensagens com ${w.w}px (left=${w.left}, vw=${w.vw}): texto cortado em "Sele/uma/conv"`).toBeGreaterThanOrEqual(240);
  });

  test('[BUG P3-18] depois de abrir uma conversa em 390px da para ler a mensagem e usar o campo de resposta', async ({ page }) => {
    await boot(page, '/customers?tab=support');
    await page.getByText('Moto não destrava').first().click();
    await page.waitForTimeout(500);
    await s3(page, 'm-support-chat');
    const box = await page.getByPlaceholder('Escreva uma resposta').boundingBox();
    expect(box, 'campo de resposta fora da tela / invisivel').not.toBeNull();
    expect(box!.x + box!.width, 'campo de resposta passa da borda direita').toBeLessThanOrEqual(390);
    expect(box!.width, 'campo de resposta estreito demais para digitar').toBeGreaterThanOrEqual(120);
  });

  test('[BUG P3-19] sub-abas Conversas/Contestacoes/Sinistros/Ocorrencias cabem todas (nenhuma cortada)', async ({ page }) => {
    await boot(page, '/customers?tab=support');
    const info = await page.getByRole('button', { name: 'Ocorrências' }).evaluate((el) => { const r = el.getBoundingClientRect(); const g = el.closest('[role=group]') as HTMLElement; const gr = g.getBoundingClientRect(); return { right: Math.round(r.right), groupRight: Math.round(gr.right), vw: window.innerWidth }; });
    expect(info.right, 'a aba "Ocorrencias" fica fora do controle (cortada) e nao ha rolagem').toBeLessThanOrEqual(info.groupRight);
  });
});

test.describe('390px: tabelas e cabecalho', () => {
  for (const [name, path, tid] of [['/alerts', '/alerts', 'alerts-table'], ['/customers', '/customers', 'customers-table'], ['/team', '/team', null]] as const) {
    test(`[BUG P3-20] ${name}: tabela principal nao esconde mais da metade das colunas sem indicacao de rolagem`, async ({ page }) => {
      await boot(page, path);
      const sel = tid ? `[data-testid="${tid}"] .table-scroll` : '.table-scroll';
      const m = await page.locator(sel).first().evaluate((e) => ({ clip: e.scrollWidth - e.clientWidth, w: e.clientWidth, hint: !!e.closest('.dt')?.querySelector('[data-scroll-hint]') || getComputedStyle(e).maskImage !== 'none' || getComputedStyle(e.parentElement!, '::after').content !== 'none' }));
      expect(m.clip < m.w * 0.5 || m.hint, `tabela com ${m.w}px visiveis e ${m.clip}px escondidos, sem sombra/gradiente/aviso de rolagem`).toBe(true);
    });
  }

  test('[BUG P3-21] titulo do cabecalho "Equipe e acessos" nao e truncado em 390px', async ({ page }) => {
    await boot(page, '/team');
    await s3(page, 'm-team-header');
    const clip = await page.locator('.shell-title').evaluate((e) => e.scrollWidth - e.clientWidth);
    expect(clip, 'o titulo fica "Equipe e acess..." porque o trilho + paleta + 2 badges ocupam o cabecalho').toBeLessThanOrEqual(0);
  });

  test('[BUG P3-22] cartoes de contagem de baterias ocupam 2 colunas em 390px (hoje 5 cartoes empilhados = ~430px de altura)', async ({ page }) => {
    await boot(page, '/tasks');
    await page.getByRole('button', { name: 'Baterias' }).click();
    await expect(page.getByTestId('battery-counts')).toBeVisible();
    const h = await page.getByTestId('battery-counts').evaluate((e) => Math.round(e.getBoundingClientRect().height));
    expect(h, `bloco de contagens com ${h}px de altura`).toBeLessThanOrEqual(300);
  });

  test('[BUG P3-24] tabela de estacoes (390px) mostra todas as colunas sem rolar', async ({ page }) => {
    await boot(page, '/tasks');
    await page.getByRole('button', { name: 'Baterias' }).click();
    await expect(page.getByTestId('stations-table')).toBeVisible();
    const clip = await page.getByTestId('stations-table').locator('.table-scroll').evaluate((e) => e.scrollWidth - e.clientWidth);
    await s3(page, 'm-stations');
    expect(clip, 'colunas "No estoque" e "Horario" escondidas na tabela de estacoes').toBeLessThanOrEqual(1);
  });
});

test.describe('390px: dialogos', () => {
  const fits = async (page: Page, tid: string) => {
    const r = await page.getByTestId(tid).evaluate((el) => { const d = el.getBoundingClientRect(); const acts = el.querySelectorAll('button'); const last = acts[acts.length - 1]!.getBoundingClientRect(); return { l: Math.round(d.left), r: Math.round(d.right), t: Math.round(d.top), b: Math.round(d.bottom), vw: window.innerWidth, vh: window.innerHeight, lastB: Math.round(last.bottom) }; });
    return r;
  };

  test('transferencia de baterias: cabe na tela e o botao Confirmar fica visivel', async ({ page }) => {
    await boot(page, '/tasks');
    await page.getByRole('button', { name: 'Baterias' }).click();
    await page.getByTestId('van-load').click();
    await page.getByTestId('transfer-dialog').waitFor();
    await s3(page, 'm-transfer-dialog');
    const r = await fits(page, 'transfer-dialog');
    expect(r.l).toBeGreaterThanOrEqual(0);
    expect(r.r).toBeLessThanOrEqual(r.vw);
    expect(r.lastB).toBeLessThanOrEqual(r.vh);
  });

  test('dialogo de modelo (560px) cabe em 390px e da para rolar ate Salvar', async ({ page }) => {
    await boot(page, '/settings');
    await page.getByTestId('new-model').click();
    await page.getByTestId('model-dialog').waitFor();
    await s3(page, 'm-model-dialog');
    const r = await fits(page, 'model-dialog');
    expect(r.l).toBeGreaterThanOrEqual(0);
    expect(r.r).toBeLessThanOrEqual(r.vw);
    await page.getByTestId('model-save').scrollIntoViewIfNeeded();
    const b = await page.getByTestId('model-save').boundingBox();
    expect(b!.y + b!.height).toBeLessThanOrEqual(844);
  });

  test('[BUG P3-23] dialogo de modelo em 390px: campos de 2 colunas (Nome/Identificador, Preco/Desbloqueio) nao ficam esmagados (< 120px)', async ({ page }) => {
    await boot(page, '/settings');
    await page.getByTestId('new-model').click();
    const w = await page.getByTestId('model-name').evaluate((e) => Math.round(e.getBoundingClientRect().width));
    await s3(page, 'm-model-dialog-fields');
    expect(w, `campo Nome com ${w}px`).toBeGreaterThanOrEqual(150);
  });

  test('lista de restricao (640px) cabe em 390px', async ({ page }) => {
    await boot(page, '/customers');
    await page.getByRole('button', { name: 'Lista de restrição' }).click();
    const d = page.getByRole('dialog');
    await d.waitFor();
    await s3(page, 'm-restrictions');
    const r = await d.evaluate((el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, vw: window.innerWidth, sw: el.scrollWidth - el.clientWidth }; });
    expect(r.l).toBeGreaterThanOrEqual(0);
    expect(r.r).toBeLessThanOrEqual(r.vw);
  });
});
