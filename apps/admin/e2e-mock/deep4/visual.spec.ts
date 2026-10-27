import { expect, test, type Page } from '@playwright/test';
import { loginMocked } from '../login';
import { MOBILE } from '../helpers';
import { hOverflow, s4, watch } from './util4';

const SCREENS = [
  { name: 'fleet', path: '/fleet', ready: (p: Page) => p.getByTestId('dashboard-strip') },
  { name: 'customers', path: '/customers', ready: (p: Page) => p.locator('tbody tr').first() },
  { name: 'alerts', path: '/alerts', ready: (p: Page) => p.locator('#main-content') },
];

/** Texto cortado sem reticencias e elementos de texto que se sobrepoem (interseccao de caixas de irmaos visiveis). */
async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const vis = (el: Element) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
    // 1) texto cortado sem text-overflow: ellipsis
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main *, header *, nav *'))) {
      if (!vis(el) || el.children.length > 0) continue;
      const cs = getComputedStyle(el);
      if (!(el.textContent ?? '').trim()) continue;
      const clipped = (cs.overflow !== 'visible' || cs.overflowX !== 'visible') && el.scrollWidth > el.clientWidth + 2;
      if (clipped && cs.textOverflow !== 'ellipsis' && out.length < 8) out.push(`texto cortado sem reticencias: <${el.tagName.toLowerCase()}> "${(el.textContent ?? '').trim().slice(0, 40)}" ${el.scrollWidth}>${el.clientWidth}`);
    }
    // 2) botoes/chips/tiles que se sobrepoem entre si
    const cand = Array.from(document.querySelectorAll<HTMLElement>('main button, main [role="group"] > *, main [data-testid="dashboard-strip"] > *, header button, header a')).filter((e) => vis(e) && (e.textContent ?? '').trim() !== '');
    for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
      const a = cand[i]!, b = cand[j]!;
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 4 && h > 4 && out.length < 8) out.push(`sobreposicao ${Math.round(w)}x${Math.round(h)}: "${(a.textContent ?? '').trim().slice(0, 20)}" x "${(b.textContent ?? '').trim().slice(0, 20)}"`);
    }
    return out;
  });
}

for (const vp of [{ label: '1440', size: { width: 1440, height: 900 } }, { label: '390', size: MOBILE }]) {
  test.describe(`acabamento @${vp.label}`, () => {
    for (const sc of SCREENS) {
      test(`${sc.name}: sem rolagem horizontal, texto cortado ou sobreposicao`, async ({ page }) => {
        await page.setViewportSize(vp.size);
        const mock = await loginMocked(page);
        const c = watch(page, mock);
        await page.goto(sc.path);
        await expect(sc.ready(page)).toBeVisible({ timeout: 15_000 });
        await page.waitForTimeout(1200);
        await s4(page, `${sc.name}-${vp.label}`);
        expect(await hOverflow(page)).toBeLessThanOrEqual(1);
        const probs = await layoutProblems(page);
        expect(probs, probs.join('\n')).toEqual([]);
        expect(c.finish(`deep4-visual-${sc.name}-${vp.label}`)).toEqual([]);
      });
    }
  });
}

test.describe('camadas: toast sobre ficha sobre mapa', () => {
  for (const vp of [{ label: '1440', size: { width: 1440, height: 900 } }, { label: '390', size: MOBILE }]) {
    test(`@${vp.label}: ao bloquear a moto, o toast fica por cima da ficha e nao cobre o botao de confirmar`, async ({ page }) => {
      await page.setViewportSize(vp.size);
      const mock = await loginMocked(page);
      const c = watch(page, mock);
      await page.goto('/fleet?vehicle=veh-002');
      await page.getByTestId('vehicle-sheet').waitFor();
      await page.waitForTimeout(800);
      await s4(page, `layers-sheet-${vp.label}`);
      // ficha acima do mapa: o ponto central da ficha pertence a ficha, nao ao canvas
      const sheetOnTop = await page.evaluate(() => {
        const s = document.querySelector('[data-testid="vehicle-sheet"]')!.getBoundingClientRect();
        const el = document.elementFromPoint(s.left + s.width / 2, s.top + Math.min(40, s.height / 2));
        return !!el?.closest('[data-testid="vehicle-sheet"]');
      });
      expect(sheetOnTop).toBe(true);
      // dispara um toast pela acao de bloquear/desbloquear
      const lock = page.getByTestId('cmd-lock');
      const unlock = page.getByTestId('cmd-unlock');
      const btn = (await lock.count()) ? lock : unlock;
      await btn.first().scrollIntoViewIfNeeded();
      await btn.first().click();
      const dlg = page.getByTestId('command-dialog');
      await dlg.waitFor();
      await page.waitForTimeout(500);
      await dlg.locator('textarea').fill('Teste de camadas');
      await s4(page, 'layers-dialog-' + vp.label);
      await dlg.getByRole('button', { name: 'Confirmar e enviar' }).click();
      await expect.poll(() => mock.calls.filter((x) => /commands/.test(x.path) && x.method === 'POST').length).toBe(1);
      mock.emit('command.updated', { commandId: 'cmd-1', vehicleId: 'veh-002', type: 'lock', status: 'confirmed' });
      await page.locator('[aria-live="polite"] > div').first().waitFor({ timeout: 8000 });
      await page.waitForTimeout(500);
      await s4(page, `layers-toast-${vp.label}`);
      const res = await page.evaluate(() => {
        const t = document.querySelector<HTMLElement>('[aria-live="polite"] > div');
        if (!t) return null;
        const r = t.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { text: (t.textContent ?? '').trim().slice(0, 60), onTop: !!el && t.contains(el), right: Math.round(r.right), left: Math.round(r.left), vw: document.documentElement.clientWidth };
      });
      console.log(`[deep4] toast @${vp.label}: ${JSON.stringify(res)}`);
      expect(res, 'toast nao apareceu').not.toBeNull();
      if (res) {
        expect(res.onTop, 'toast atras de outro elemento').toBe(true);
        expect(res.left).toBeGreaterThanOrEqual(0);
        expect(res.right).toBeLessThanOrEqual(res.vw);
      }
      expect(c.finish(`deep4-layers-${vp.label}`)).toEqual([]);
    });
  }
});

test('[BUG P4-06] 390px /customers: placeholder da busca fica cortado ("...e-mail ou telefo")', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await loginMocked(page);
  await page.goto('/customers');
  const input = page.getByPlaceholder(/Buscar por nome, CPF/);
  await expect(input).toBeVisible();
  const r = await input.evaluate((el: HTMLInputElement) => {
    const cs = getComputedStyle(el);
    const c = document.createElement('canvas').getContext('2d')!;
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return { need: Math.ceil(c.measureText(el.placeholder).width), avail: Math.floor(avail), ph: el.placeholder };
  });
  await s4(page, 'p4-06-customers-placeholder-390');
  expect(r.need, `placeholder "${r.ph}" precisa de ${r.need}px e cabem ${r.avail}px`).toBeLessThanOrEqual(r.avail);
});
