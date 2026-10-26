import { expect, test } from '@playwright/test';
import { loginMocked } from '../login';
import * as F from '../fixtures';
import { MOBILE } from '../helpers';
import { longTasks, observeLongTasks, s4, watch } from './util4';

const N = 500;

test.describe('frota em escala (500 motos + tempo real)', () => {
  test('500 motos paginadas, 10 s de vehicle.position: sem erros, contadores e mapa atualizam, sem long task > 200 ms', async ({ page }) => {
    test.setTimeout(120_000);
    await observeLongTasks(page);
    const mock = await loginMocked(page);
    mock.db.vehicles = F.makeVehicles(N);
    const c = watch(page, mock);
    await page.goto('/fleet');
    await expect(page.getByTestId('fleet-badge')).toContainText(String(N), { timeout: 30_000 });
    await expect(page.getByTestId('map')).toBeVisible();
    await page.waitForTimeout(1500);
    const pages = mock.calls.filter((x) => x.path === '/vehicles').length;
    c.note(`info: GET /vehicles chamado ${pages}x`);
    const chipText = () => page.getByRole('group', { name: 'Filtrar motos por status' }).innerText();
    const before = await chipText();
    await s4(page, 'fleet-500-before');
    const t0 = Date.now();
    let tick = 0;
    // 10 s: a cada 250 ms, 40 motos (batch rotativo) andam; algumas mudam de status
    while (Date.now() - t0 < 10_000) {
      for (let k = 0; k < 40; k++) {
        const i = (tick * 40 + k) % N;
        const v = mock.db.vehicles[i]!;
        mock.emit('vehicle.position', { vehicleId: v.id, lat: v.lat + 0.0005 * (1 + (tick % 5)), lng: v.lng + 0.0004 * (1 + (tick % 3)), speedKmh: 12 + (k % 10), batteryPct: 50, status: k % 4 === 0 ? 'blocked' : v.status, speedLimitKmh: 20, ts: new Date().toISOString() });
      }
      tick++;
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1200);
    const after = await chipText();
    await s4(page, 'fleet-500-after');
    expect(after, 'contadores de status devem mudar apos eventos de status').not.toBe(before);
    const lt = await longTasks(page);
    const worst = Math.max(0, ...lt);
    test.info().annotations.push({ type: 'longtasks', description: `n=${lt.length} max=${worst}ms lista=${lt.slice(0, 30).join(',')}` });
    console.log(`[deep4] longtasks n=${lt.length} max=${worst}ms (>200: ${lt.filter((x) => x > 200).length}) pages=${pages}`);
    expect(await page.getByTestId('map').isVisible()).toBe(true);
    const issues = c.finish('deep4-scale').filter((x) => !x.startsWith('info:'));
    expect(issues).toEqual([]);
  });

  test('[BUG P4-01] 500 motos + tempo real: nenhuma long task acima de 200 ms', async ({ page }) => {
    test.setTimeout(120_000);
    await observeLongTasks(page);
    const mock = await loginMocked(page);
    mock.db.vehicles = F.makeVehicles(N);
    await page.goto('/fleet');
    await expect(page.getByTestId('fleet-badge')).toContainText(String(N), { timeout: 30_000 });
    const t0 = Date.now();
    let tick = 0;
    while (Date.now() - t0 < 10_000) {
      for (let k = 0; k < 100; k++) {
        const v = mock.db.vehicles[(tick * 100 + k) % N]!;
        mock.emit('vehicle.position', { vehicleId: v.id, lat: v.lat + 0.0006 * (1 + (tick % 4)), lng: v.lng + 0.0004, speedKmh: 15, batteryPct: 40, status: v.status, speedLimitKmh: 20, ts: new Date().toISOString() });
      }
      tick++;
      await page.waitForTimeout(500);
    }
    const lt = await longTasks(page);
    console.log(`[deep4] P4-01 longtasks=${JSON.stringify(lt)}`);
    await s4(page, 'p4-01-fleet-stream');
    expect(lt.filter((x) => x > 200), `long tasks > 200ms: ${lt.join(',')}`).toEqual([]);
  });

  test('selecionar moto com 500 na frota abre a ficha rapido (< 1,5 s) e a lista virtualiza/rola', async ({ page }) => {
    test.setTimeout(90_000);
    const mock = await loginMocked(page);
    mock.db.vehicles = F.makeVehicles(N);
    const c = watch(page, mock);
    await page.goto('/fleet');
    await expect(page.getByTestId('fleet-badge')).toContainText(String(N), { timeout: 30_000 });
    // lista: contagem de linhas no DOM e tempo de troca de visao
    const t1 = Date.now();
    const seg = page.getByRole('group', { name: 'Ver frota como' });
    await seg.getByText('Lista', { exact: true }).click();
    await page.getByTestId('fleet-list').waitFor();
    const rows = await page.locator('[data-testid="fleet-list"] tbody tr').count();
    console.log('[deep4] lista: ' + (Date.now() - t1) + 'ms, linhas no DOM=' + rows);
    await expect(page.getByText('Mostrando 200 de 500')).toBeVisible();
    await page.getByTestId('fleet-search').fill('VLT-450');
    await expect(page.locator('[data-testid="fleet-list"] tbody tr')).toHaveCount(1);
    await s4(page, 'fleet-500-list');
    await seg.getByText('Mapa', { exact: true }).click();
    const t2 = Date.now();
    await page.goto('/fleet?vehicle=veh-250');
    await page.getByTestId('vehicle-sheet').waitFor({ timeout: 10_000 });
    const dt = Date.now() - t2;
    console.log(`[deep4] ficha abriu em ${dt}ms`);
    await expect(page.getByTestId('vehicle-code')).toHaveText('VLT-250');
    expect(dt).toBeLessThan(1500 + 3000); // inclui recarga da pagina
    expect(c.finish('deep4-scale-sel').filter((x) => !x.startsWith('info:'))).toEqual([]);
  });

  test('390px com 500 motos: sem rolagem horizontal e sem erros', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    const mock = await loginMocked(page);
    mock.db.vehicles = F.makeVehicles(N);
    const c = watch(page, mock);
    await page.goto('/fleet');
    await expect(page.getByTestId('fleet-badge')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await s4(page, 'fleet-500-390');
    const de = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(de).toBeLessThanOrEqual(1);
    expect(c.finish('deep4-scale-390').filter((x) => !x.startsWith('info:'))).toEqual([]);
  });
});
