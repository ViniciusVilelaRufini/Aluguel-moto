import { expect, test } from '@playwright/test';
import { loginMocked } from '../login';
import { override } from './fixtures3';
import { s3 } from './util3';

test('[BUG P3-25] resumo da van usa singular com 1 bateria ("1 carregada", "1 descarregada")', async ({ page }) => {
  const mock = await loginMocked(page);
  await override(page, mock, 'GET', /api\.mock\.local\/batteries\/van-stock/, { operatorId: 'staff-campo', total: 2, chargedCount: 1, depletedCount: 1, items: [] });
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Baterias' }).click();
  await expect(page.getByTestId('van-summary')).toContainText('no total');
  await s3(page, 'van-plural');
  await expect(page.getByTestId('van-summary')).toContainText(/1 carregada(?!s)/);
});

test('celulas mono (Serie, Acao) ficam alinhadas verticalmente com as celulas de texto da mesma linha (<= 1px)', async ({ page }) => {
  await loginMocked(page);
  await page.goto('/team');
  await page.getByRole('button', { name: 'Auditoria' }).click();
  await page.getByTestId('audit-table').getByTestId('row').first().waitFor();
  const d = await page.getByTestId('audit-table').getByTestId('row').first().evaluate((tr) => {
    const centre = (td: Element) => { const r = document.createRange(); r.selectNodeContents(td); const b = r.getBoundingClientRect(); return b.top + b.height / 2; };
    const tds = Array.from(tr.querySelectorAll('td'));
    return { text: centre(tds[1]!), mono: centre(tds[2]!) };
  });
  expect(Math.abs(d.text - d.mono), `texto em ${d.text.toFixed(1)} e mono em ${d.mono.toFixed(1)}`).toBeLessThanOrEqual(1);
});

test('Esc fecha o dialogo de transferencia e devolve o foco ao botao que abriu', async ({ page }) => {
  await loginMocked(page);
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Baterias' }).click();
  await page.getByTestId('van-load').click();
  await expect(page.getByTestId('transfer-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('transfer-dialog')).toHaveCount(0);
  await expect(page.getByTestId('van-load')).toBeFocused();
});

test('toast aparece acima do dialogo (z-index) apos resolver contestacao', async ({ page }) => {
  const mock = await loginMocked(page);
  await override(page, mock, 'POST', /api\.mock\.local\/batteries\/van-stock\/load/, { operatorId: 'x', total: 1, chargedCount: 1, depletedCount: 0, items: [] });
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Baterias' }).click();
  await page.getByTestId('van-load').click();
  await page.getByTestId('transfer-serials').fill('BT-777');
  await page.getByTestId('transfer-save').click();
  const t = page.getByText('1 bateria(s) na van');
  await expect(t).toBeVisible();
  const top = await t.evaluate((el) => { const r = el.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (el === e || el.contains(e)); });
  expect(top).toBe(true);
});

test('[BUG P3-27] /settings em 1440px: coluna "Ativo" da tabela de planos nao fica cortada pelo cartao', async ({ page }) => {
  await loginMocked(page);
  await page.goto('/settings');
  await expect(page.getByLabel('Preço Por minuto')).toBeVisible();
  await page.waitForTimeout(600);
  await s3(page, 'settings-plans-clip');
  const m = await page.getByLabel('Preço Por minuto').evaluate((el) => {
    const sc = el.closest('.table-scroll') as HTMLElement;
    return { clip: sc.scrollWidth - sc.clientWidth, w: sc.clientWidth };
  });
  expect(m.clip, `tabela de planos com ${m.w}px visiveis e ${m.clip}px escondidos: o cabecalho "Ativo" aparece como "A" e os interruptores saem cortados`).toBeLessThanOrEqual(1);
});

test('[BUG P3-StatTile] /fleet 1440px: rotulo em 2 linhas nao desalinha os valores dos 4 indicadores', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginMocked(page);
  await page.goto('/fleet?vehicle=veh-001');
  await expect(page.getByTestId('dashboard-strip')).toBeVisible();
  await page.waitForTimeout(900);
  const strip = page.getByTestId('dashboard-strip');
  await strip.locator('.stat-tile .stat-label span').first().evaluate((e) => { e.textContent = 'Alertas abertos agora'; (e.closest('.stat-tile') as HTMLElement).style.width = '170px'; });
  const tops = await strip.locator('.stat-value').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(tops.length).toBe(4);
  expect(new Set(tops).size, `valores em alturas diferentes: ${tops.join(',')}`).toBe(1);
});

test('/finance 1440px: valores dos indicadores seguem alinhados ao topo com e sem variacao', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginMocked(page);
  await page.goto('/finance');
  await expect(page.locator('.stat-tile').first()).toBeVisible();
  await page.waitForTimeout(900);
  const r = await page.locator('.stat-tile').evaluateAll((els) => els.map((t) => {
    const tr = t.getBoundingClientRect(); const v = t.querySelector('.stat-value')!.getBoundingClientRect();
    return { off: Math.round(v.top - tr.top), hasDelta: t.textContent!.includes('%') };
  }));
  const offs = new Set(r.map((x) => x.off));
  expect(offs.size, `deslocamento do valor por cartao: ${JSON.stringify(r)}`).toBe(1);
});
